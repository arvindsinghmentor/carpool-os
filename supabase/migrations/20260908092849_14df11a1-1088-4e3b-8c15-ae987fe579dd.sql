drop view if exists public.public_profiles;

create or replace function public.get_public_profiles(_ids uuid[])
returns table (id uuid, name text, profile_photo text, gender text, role text, verification_status text, rating numeric, reliability_score integer, account_status text, is_demo boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.profile_photo, p.gender, p.role, p.verification_status, p.rating, p.reliability_score, p.account_status, p.is_demo, p.created_at
  from public.profiles p where p.id = any(_ids) and auth.uid() is not null
$$;

-- revoke from anon (and public) on every function
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' loop
    execute format('revoke all on function %s from public, anon', f.sig);
  end loop;
end $$;

-- internal-only helpers
revoke all on function public.notify(uuid,text,text,text) from authenticated;
revoke all on function public.recompute_user_scores(uuid) from authenticated;
revoke all on function public.handle_new_user() from authenticated;
revoke all on function public.enforce_ride_driver_status() from authenticated;
revoke all on function public.update_updated_at_column() from authenticated;
revoke all on function public.assert_active_account() from authenticated;
revoke all on function public.is_blocked_between(uuid,uuid) from authenticated;

grant execute on function public.get_public_profiles(uuid[]) to authenticated;