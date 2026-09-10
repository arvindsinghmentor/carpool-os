-- ============ SECURITY FIXES ============

-- 1. FIX: ratings_select policy - remove the active-ride clause that leaks rating data
-- The clause `exists (select 1 from public.rides r where r.status = 'active' and r.driver_id = ratings.to_user_id)`
-- allowed ANY authenticated user to read ratings for ANY driver with an active ride.
-- This is a data leak. Only the rating author, recipient, and admins should see ratings.
drop policy if exists "ratings_select" on public.ratings;
create policy "ratings_select" on public.ratings for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());

-- 2. ADMIN BOOTSTRAP: Create a service-role-only function to grant the first admin role
-- This function can ONLY be called by the service role (bypasses RLS) or an existing admin.
-- It is NOT exposed to authenticated users via GRANT.
-- Usage: call via service role client: supabaseAdmin.rpc('bootstrap_admin', { _user_id: 'uuid' })
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

-- 3. FIX: get_public_profiles - remove is_demo and account_status exposure
-- These fields are not needed for public profile display:
-- - account_status: only used for current user's own profile (fetched via profiles table directly)
-- - is_demo: not used anywhere in the UI
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
  created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.profile_photo, p.gender, p.role, p.verification_status, p.rating, p.reliability_score, p.created_at
  from public.profiles p
  where p.id = any(_ids) and auth.uid() is not null
$$;

grant execute on function public.get_public_profiles(uuid[]) to authenticated;

-- 4. FIX: profiles_update_own - the current policy is actually correct and secure
-- It uses subqueries in WITH CHECK to prevent changes to sensitive fields.
-- This is a valid PostgreSQL pattern. No change needed.
-- (Keeping this comment for audit trail)

-- 5. SOS EVENTS - intentionally immutable (no UPDATE/DELETE policies)
-- This is by design for audit trail integrity. No change needed.

-- 6. VERIFY: All SECURITY DEFINER functions have explicit search_path = public
-- Already verified in existing migrations. No change needed.

-- 7. VERIFY: Service role key is server-only
-- Confirmed: client.server.ts is not imported by any client-facing code.
-- The warning comment explicitly states it's only safe in .server.ts modules.
-- No change needed.