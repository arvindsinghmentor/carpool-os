-- ============ SECURITY FIXES ============
-- Migration: 20260908093003_security_fixes.sql
-- Purpose: Fix RLS data leaks, add admin bootstrap mechanism, reduce profile exposure

-- 1. FIX: ratings_select policy
-- The clause `exists (select 1 from public.rides r where r.status = 'active' and r.driver_id = ratings.to_user_id)`
-- allowed ANY authenticated user to read ratings for ANY driver with an active ride.
-- This is a data leak. Only the rating author, recipient, and admins should see ratings.
drop policy if exists "ratings_select" on public.ratings;
create policy "ratings_select" on public.ratings for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());

-- 2. ADMIN BOOTSTRAP: Create a service-role-only function to grant the first admin role
-- This function can ONLY be called by the service role (postgres) or an existing admin.
-- It is NOT exposed to authenticated users via GRANT.
-- Usage: call via service role client: supabaseAdmin.rpc('bootstrap_admin', { _user_id: 'uuid' })
-- Required manual action: Provide the first admin's user ID (UUID) to call this function.
create or replace function public.bootstrap_admin(_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_caller text;
begin
  -- Only allow service role or existing admin to call this
  -- current_user in SECURITY DEFINER context is the function owner (postgres/service_role)
  -- We also check is_admin() for defense in depth
  if not (current_user = 'postgres' or current_user = 'supabase_admin' or public.is_admin()) then
    raise exception 'Forbidden: only service role or admin can bootstrap admin' using errcode = '42501';
  end if;

  -- Verify the target user exists
  if not exists (select 1 from public.profiles where id = _user_id) then
    raise exception 'User not found' using errcode = 'P0001';
  end if;

  -- Grant admin role (idempotent)
  insert into public.user_roles (user_id, role)
  values (_user_id, 'admin')
  on conflict (user_id, role) do nothing;

  -- Audit log
  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'bootstrap_admin', 'profile', _user_id, jsonb_build_object('note', 'Initial admin bootstrap'));
end; $$;

-- Revoke from all roles - only service role (postgres) can execute
revoke all on function public.bootstrap_admin(uuid) from public, anon, authenticated;

-- 3. FIX: get_public_profiles - remove is_demo exposure (not used anywhere in the UI)
-- Keep account_status because it's needed by the matching logic to filter out suspended drivers
-- The function still requires auth.uid() is not null (authenticated users only)
drop function if exists public.get_public_profiles(uuid[]);
create or replace function public.get_public_profiles(_ids uuid[])
returns table (
  id uuid,
  name text,
  profile_photo text,
  gender text,
  role text,
  verification_status text,
  rating numeric,
  reliability_score integer,
  account_status text,
  created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.profile_photo, p.gender, p.role, p.verification_status, p.rating, p.reliability_score, p.account_status, p.created_at
  from public.profiles p
  where p.id = any(_ids) and auth.uid() is not null
$$;

grant execute on function public.get_public_profiles(uuid[]) to authenticated;

-- 4. VERIFY: profiles_update_own policy is correct
-- The current policy uses subqueries in WITH CHECK to prevent changes to sensitive fields.
-- This is a valid PostgreSQL pattern. No change needed.
-- Users cannot change account_status, rating, reliability_score, verification_status via direct DB access.

-- 5. SOS EVENTS - intentionally immutable (no UPDATE/DELETE policies)
-- This is by design for audit trail integrity. No change needed.

-- 6. VERIFY: All SECURITY DEFINER functions have explicit search_path = public
-- Already verified in existing migrations. No change needed.

-- 7. VERIFY: Service role key is server-only
-- Confirmed: client.server.ts is not imported by any client-facing code.
-- The warning comment explicitly states it's only safe in .server.ts modules.
-- No change needed.
