-- ============ ENUMS ============
create type public.app_role as enum ('admin', 'moderator', 'user');

-- ============ HELPERS ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key,
  name text not null default '',
  phone text,
  email text,
  profile_photo text,
  gender text check (gender in ('male','female','other','prefer_not_to_say')),
  role text not null default 'passenger' check (role in ('passenger','driver','both')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified')),
  rating numeric(3,2) not null default 0 check (rating >= 0 and rating <= 5),
  reliability_score integer not null default 100 check (reliability_score between 0 and 100),
  account_status text not null default 'active' check (account_status in ('active','suspended')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create policy "roles_select_own_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- profiles policies
create policy "profiles_select_own_or_admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and account_status = (select p.account_status from public.profiles p where p.id = auth.uid()) and rating = (select p.rating from public.profiles p where p.id = auth.uid()) and reliability_score = (select p.reliability_score from public.profiles p where p.id = auth.uid()) and verification_status = (select p.verification_status from public.profiles p where p.id = auth.uid()));

-- Safe public card of any profile (no phone/email)
create view public.public_profiles with (security_barrier = true) as
  select id, name, profile_photo, gender, role, verification_status, rating, reliability_score, account_status, is_demo, created_at
  from public.profiles;
grant select on public.public_profiles to authenticated;

-- signup trigger
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, profile_photo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)),
    new.email,
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    new.raw_user_meta_data->>'avatar_url'
  ) on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ BLOCKS ============
create table public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
grant select, insert, delete on public.user_blocks to authenticated;
grant all on public.user_blocks to service_role;
alter table public.user_blocks enable row level security;
create policy "blocks_own" on public.user_blocks for all to authenticated
  using (blocker_id = auth.uid() or public.is_admin()) with check (blocker_id = auth.uid());

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- ============ VEHICLES ============
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  make text not null,
  model text not null,
  year integer not null check (year between 1980 and 2100),
  registration_number text not null,
  seat_capacity integer not null check (seat_capacity between 1 and 8),
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_user_idx on public.vehicles(user_id);
grant select, insert, update, delete on public.vehicles to authenticated;
grant all on public.vehicles to service_role;
alter table public.vehicles enable row level security;
create trigger vehicles_updated_at before update on public.vehicles for each row execute function public.update_updated_at_column();

-- ============ ROUTES ============
create table public.routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  origin_text text not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  destination_text text not null,
  destination_lat double precision not null,
  destination_lng double precision not null,
  departure_time time not null,
  recurring_days smallint[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routes_user_idx on public.routes(user_id);
grant select, insert, update, delete on public.routes to authenticated;
grant all on public.routes to service_role;
alter table public.routes enable row level security;
create trigger routes_updated_at before update on public.routes for each row execute function public.update_updated_at_column();

-- ============ RIDES ============
create table public.rides (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  route_id uuid not null references public.routes(id) on delete restrict,
  date date not null,
  departure_time time not null,
  available_seats integer not null check (available_seats >= 0),
  total_seats integer not null check (total_seats between 1 and 8),
  price_per_passenger numeric(10,2) not null check (price_per_passenger >= 0),
  status text not null default 'draft' check (status in ('draft','active','cancelled','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rides_driver_idx on public.rides(driver_id);
create index rides_date_status_idx on public.rides(date, status);
create index rides_route_idx on public.rides(route_id);
grant select, insert, update, delete on public.rides to authenticated;
grant all on public.rides to service_role;
alter table public.rides enable row level security;
create trigger rides_updated_at before update on public.rides for each row execute function public.update_updated_at_column();

-- suspended drivers cannot create/publish active rides
create or replace function public.enforce_ride_driver_status()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if new.status = 'active' then
    select account_status into v_status from public.profiles where id = new.driver_id;
    if v_status is distinct from 'active' then
      raise exception 'Suspended accounts cannot publish rides' using errcode = 'P0001';
    end if;
  end if;
  return new;
end; $$;
create trigger rides_enforce_driver_status before insert or update on public.rides for each row execute function public.enforce_ride_driver_status();

-- ============ BOOKINGS ============
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  seats integer not null check (seats between 1 and 8),
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'requested' check (status in ('requested','confirmed','rejected','cancelled','completed')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index bookings_ride_idx on public.bookings(ride_id);
create index bookings_passenger_idx on public.bookings(passenger_id);
create unique index bookings_one_open_per_ride on public.bookings(ride_id, passenger_id) where status in ('requested','confirmed');
grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;

-- ============ TRIPS ============
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled','active','completed','cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.trips to authenticated;
grant all on public.trips to service_role;
alter table public.trips enable row level security;

-- ============ RATINGS ============
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (trip_id, from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);
create index ratings_to_idx on public.ratings(to_user_id);
grant select on public.ratings to authenticated;
grant all on public.ratings to service_role;
alter table public.ratings enable row level security;

-- ============ REPORTS ============
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  category text not null check (category in ('safety','behaviour','no_show','payment','vehicle','support','other')),
  description text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index reports_status_idx on public.reports(status);
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, read_at);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

-- ============ PAYMENTS ============
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  gross_amount numeric(10,2) not null check (gross_amount >= 0),
  platform_fee numeric(10,2) not null check (platform_fee >= 0),
  net_amount numeric(10,2) not null check (net_amount >= 0),
  status text not null default 'pending' check (status in ('pending','authorized','captured','settled','refunded','cancelled','failed')),
  provider text not null default 'none',
  provider_reference text,
  created_at timestamptz not null default now()
);
create index payments_payer_idx on public.payments(payer_id);
create index payments_receiver_idx on public.payments(receiver_id);
create index payments_booking_idx on public.payments(booking_id);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;

-- ============ SOS ============
create table public.sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete set null,
  lat double precision,
  lng double precision,
  note text,
  status text not null default 'open' check (status in ('open','acknowledged','closed')),
  created_at timestamptz not null default now()
);
grant select, insert on public.sos_events to authenticated;
grant all on public.sos_events to service_role;
alter table public.sos_events enable row level security;
create policy "sos_own_or_admin" on public.sos_events for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "sos_insert_own" on public.sos_events for insert to authenticated with check (user_id = auth.uid());

-- ============ ADMIN AUDIT ============
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_admin_idx on public.admin_audit_logs(admin_id, created_at desc);
grant select on public.admin_audit_logs to authenticated;
grant all on public.admin_audit_logs to service_role;
alter table public.admin_audit_logs enable row level security;
create policy "audit_admin_read" on public.admin_audit_logs for select to authenticated using (public.is_admin());

-- ============ POLICIES ============
create policy "vehicles_select" on public.vehicles for select to authenticated
  using (user_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.rides r where r.driver_id = vehicles.user_id and r.status in ('active','completed')));
create policy "vehicles_insert_own" on public.vehicles for insert to authenticated with check (user_id = auth.uid());
create policy "vehicles_update_own" on public.vehicles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and verification_status = (select v.verification_status from public.vehicles v where v.id = vehicles.id));
create policy "vehicles_delete_own" on public.vehicles for delete to authenticated using (user_id = auth.uid());

create policy "routes_select" on public.routes for select to authenticated
  using (user_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.rides r where r.route_id = routes.id and (r.status = 'active'
      or exists (select 1 from public.bookings b where b.ride_id = r.id and b.passenger_id = auth.uid()))));
create policy "routes_insert_own" on public.routes for insert to authenticated with check (user_id = auth.uid());
create policy "routes_update_own" on public.routes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "routes_delete_own" on public.routes for delete to authenticated using (user_id = auth.uid());

create policy "rides_select" on public.rides for select to authenticated
  using (driver_id = auth.uid() or public.is_admin() or status = 'active'
    or exists (select 1 from public.bookings b where b.ride_id = rides.id and b.passenger_id = auth.uid()));
create policy "rides_insert_own" on public.rides for insert to authenticated with check (driver_id = auth.uid() and status in ('draft','active') and available_seats = total_seats);
create policy "rides_update_own_draft" on public.rides for update to authenticated
  using (driver_id = auth.uid() and status = 'draft') with check (driver_id = auth.uid() and status = 'draft' and available_seats = total_seats);
create policy "rides_delete_own_draft" on public.rides for delete to authenticated using (driver_id = auth.uid() and status = 'draft');

create policy "bookings_select" on public.bookings for select to authenticated
  using (passenger_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.rides r where r.id = bookings.ride_id and r.driver_id = auth.uid()));

create policy "trips_select" on public.trips for select to authenticated
  using (public.is_admin() or exists (select 1 from public.rides r where r.id = trips.ride_id and (r.driver_id = auth.uid()
    or exists (select 1 from public.bookings b where b.ride_id = r.id and b.passenger_id = auth.uid()))));

create policy "ratings_select" on public.ratings for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.rides r where r.status = 'active' and r.driver_id = ratings.to_user_id));

create policy "reports_select" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_insert" on public.reports for insert to authenticated with check (reporter_id = auth.uid());

create policy "notifications_select_own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "payments_select" on public.payments for select to authenticated
  using (payer_id = auth.uid() or receiver_id = auth.uid() or public.is_admin());

-- ============ INTERNAL HELPERS ============
create or replace function public.notify(_user uuid, _type text, _title text, _message text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, type, title, message) values (_user, _type, _title, _message)
$$;
revoke all on function public.notify(uuid,text,text,text) from public, anon, authenticated;

create or replace function public.recompute_user_scores(_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_avg numeric; v_completed int; v_cancelled int; v_rel int;
begin
  select coalesce(round(avg(score)::numeric, 2), 0) into v_avg from public.ratings where to_user_id = _user;
  -- deterministic reliability: completed vs cancelled commitments (as driver and as passenger)
  select
    (select count(*) from public.trips t join public.rides r on r.id = t.ride_id where r.driver_id = _user and t.status = 'completed')
    + (select count(*) from public.bookings b where b.passenger_id = _user and b.status = 'completed'),
    (select count(*) from public.trips t join public.rides r on r.id = t.ride_id where r.driver_id = _user and t.status = 'cancelled')
    + (select count(*) from public.bookings b where b.passenger_id = _user and b.status = 'cancelled')
  into v_completed, v_cancelled;
  if v_completed + v_cancelled = 0 then v_rel := 100;
  else v_rel := round(100.0 * v_completed / (v_completed + v_cancelled)); end if;
  update public.profiles set rating = v_avg, reliability_score = v_rel where id = _user;
end; $$;
revoke all on function public.recompute_user_scores(uuid) from public, anon, authenticated;

create or replace function public.assert_active_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and account_status = 'active') then
    raise exception 'Your account is suspended' using errcode = 'P0001';
  end if;
end; $$;

-- ============ RIDE LIFECYCLE ============
create or replace function public.publish_ride(_ride_id uuid)
returns public.rides language plpgsql security definer set search_path = public as $$
declare r public.rides;
begin
  perform public.assert_active_account();
  select * into r from public.rides where id = _ride_id and driver_id = auth.uid() for update;
  if r.id is null then raise exception 'Ride not found'; end if;
  if r.status <> 'draft' then raise exception 'Only draft rides can be published'; end if;
  if not exists (select 1 from public.vehicles where user_id = auth.uid()) then raise exception 'Add a vehicle before publishing a ride'; end if;
  update public.rides set status = 'active' where id = _ride_id returning * into r;
  insert into public.trips (ride_id, status) values (_ride_id, 'scheduled') on conflict (ride_id) do nothing;
  return r;
end; $$;

create or replace function public.cancel_ride(_ride_id uuid)
returns public.rides language plpgsql security definer set search_path = public as $$
declare r public.rides; b record;
begin
  select * into r from public.rides where id = _ride_id and (driver_id = auth.uid() or public.is_admin()) for update;
  if r.id is null then raise exception 'Ride not found'; end if;
  if r.status in ('completed','cancelled') then raise exception 'Ride is already %', r.status; end if;
  if exists (select 1 from public.trips where ride_id = _ride_id and status = 'active') then raise exception 'Cannot cancel a trip in progress'; end if;
  for b in select * from public.bookings where ride_id = _ride_id and status in ('requested','confirmed') loop
    update public.bookings set status = 'cancelled', cancelled_at = now() where id = b.id;
    update public.payments set status = 'cancelled' where booking_id = b.id and status = 'pending';
    perform public.notify(b.passenger_id, 'booking_cancelled', 'Ride cancelled', 'The driver cancelled the ride on ' || to_char(r.date, 'DD Mon') || '. Your booking has been cancelled.');
  end loop;
  update public.rides set status = 'cancelled', available_seats = total_seats where id = _ride_id returning * into r;
  update public.trips set status = 'cancelled', cancelled_at = now() where ride_id = _ride_id and status in ('scheduled');
  perform public.recompute_user_scores(r.driver_id);
  return r;
end; $$;

create or replace function public.start_trip(_ride_id uuid)
returns public.trips language plpgsql security definer set search_path = public as $$
declare r public.rides; t public.trips; b record;
begin
  perform public.assert_active_account();
  select * into r from public.rides where id = _ride_id and driver_id = auth.uid() for update;
  if r.id is null then raise exception 'Ride not found'; end if;
  if r.status <> 'active' then raise exception 'Only active rides can be started'; end if;
  select * into t from public.trips where ride_id = _ride_id for update;
  if t.status <> 'scheduled' then raise exception 'Trip cannot be started from status %', t.status; end if;
  update public.trips set status = 'active', started_at = now() where id = t.id returning * into t;
  -- any still-pending requests are rejected once the trip starts
  for b in select * from public.bookings where ride_id = _ride_id and status = 'requested' loop
    update public.bookings set status = 'rejected' where id = b.id;
    update public.payments set status = 'cancelled' where booking_id = b.id and status = 'pending';
    update public.rides set available_seats = available_seats + b.seats where id = _ride_id;
    perform public.notify(b.passenger_id, 'booking_rejected', 'Request expired', 'The trip started before your request was accepted.');
  end loop;
  for b in select * from public.bookings where ride_id = _ride_id and status = 'confirmed' loop
    perform public.notify(b.passenger_id, 'trip_started', 'Trip started', 'Your driver has started the trip.');
  end loop;
  return t;
end; $$;

create or replace function public.complete_trip(_ride_id uuid)
returns public.trips language plpgsql security definer set search_path = public as $$
declare r public.rides; t public.trips; b record;
begin
  select * into r from public.rides where id = _ride_id and driver_id = auth.uid() for update;
  if r.id is null then raise exception 'Ride not found'; end if;
  select * into t from public.trips where ride_id = _ride_id for update;
  if t.status <> 'active' then raise exception 'Trip cannot be completed from status %', t.status; end if;
  update public.trips set status = 'completed', completed_at = now() where id = t.id returning * into t;
  update public.rides set status = 'completed' where id = _ride_id;
  for b in select * from public.bookings where ride_id = _ride_id and status = 'confirmed' loop
    update public.bookings set status = 'completed' where id = b.id;
    perform public.notify(b.passenger_id, 'trip_completed', 'Trip completed', 'Your trip is complete. Please rate your driver.');
    perform public.notify(b.passenger_id, 'rating_reminder', 'Rate your driver', 'How was your ride? Leave a rating.');
    perform public.recompute_user_scores(b.passenger_id);
  end loop;
  perform public.notify(r.driver_id, 'rating_reminder', 'Rate your passengers', 'Trip completed. Rate your passengers.');
  perform public.recompute_user_scores(r.driver_id);
  return t;
end; $$;

-- ============ BOOKING (atomic, no overbooking) ============
create or replace function public.create_booking(_ride_id uuid, _seats integer)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare r public.rides; b public.bookings; v_fee numeric; v_gross numeric; p_name text;
begin
  perform public.assert_active_account();
  if _seats is null or _seats < 1 then raise exception 'Seats must be at least 1'; end if;
  -- lock the ride row: concurrent requests serialize here
  select * into r from public.rides where id = _ride_id for update;
  if r.id is null then raise exception 'Ride not found'; end if;
  if r.driver_id = auth.uid() then raise exception 'You cannot book your own ride'; end if;
  if r.status <> 'active' then raise exception 'This ride is not open for booking'; end if;
  if exists (select 1 from public.trips where ride_id = _ride_id and status <> 'scheduled') then raise exception 'This ride has already started'; end if;
  if public.is_blocked_between(auth.uid(), r.driver_id) then raise exception 'Booking not available'; end if;
  if not exists (select 1 from public.profiles where id = r.driver_id and account_status = 'active') then raise exception 'This ride is not available'; end if;
  if r.available_seats < _seats then raise exception 'Only % seat(s) left', r.available_seats; end if;
  if exists (select 1 from public.bookings where ride_id = _ride_id and passenger_id = auth.uid() and status in ('requested','confirmed')) then
    raise exception 'You already have a booking on this ride';
  end if;
  update public.rides set available_seats = available_seats - _seats where id = _ride_id;
  v_gross := r.price_per_passenger * _seats;
  v_fee := round(v_gross * 0.10, 2);
  insert into public.bookings (ride_id, passenger_id, seats, amount, status)
    values (_ride_id, auth.uid(), _seats, v_gross, 'requested') returning * into b;
  insert into public.payments (booking_id, payer_id, receiver_id, gross_amount, platform_fee, net_amount, status, provider)
    values (b.id, auth.uid(), r.driver_id, v_gross, v_fee, v_gross - v_fee, 'pending', 'none');
  select name into p_name from public.profiles where id = auth.uid();
  perform public.notify(r.driver_id, 'booking_request', 'New booking request', coalesce(p_name,'A passenger') || ' requested ' || _seats || ' seat(s) for ' || to_char(r.date, 'DD Mon') || '.');
  return b;
end; $$;

create or replace function public.respond_booking(_booking_id uuid, _accept boolean)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare b public.bookings; r public.rides;
begin
  perform public.assert_active_account();
  select * into b from public.bookings where id = _booking_id for update;
  if b.id is null then raise exception 'Booking not found'; end if;
  select * into r from public.rides where id = b.ride_id and driver_id = auth.uid() for update;
  if r.id is null then raise exception 'Not your ride'; end if;
  if b.status <> 'requested' then raise exception 'Booking is already %', b.status; end if;
  if _accept then
    update public.bookings set status = 'confirmed' where id = b.id returning * into b;
    perform public.notify(b.passenger_id, 'booking_confirmed', 'Booking confirmed', 'Your seat for ' || to_char(r.date, 'DD Mon') || ' is confirmed.');
  else
    update public.bookings set status = 'rejected' where id = b.id returning * into b;
    update public.rides set available_seats = available_seats + b.seats where id = r.id;
    update public.payments set status = 'cancelled' where booking_id = b.id and status = 'pending';
    perform public.notify(b.passenger_id, 'booking_rejected', 'Booking declined', 'The driver could not accept your request for ' || to_char(r.date, 'DD Mon') || '.');
  end if;
  return b;
end; $$;

create or replace function public.cancel_booking(_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare b public.bookings; r public.rides; p_name text;
begin
  select * into b from public.bookings where id = _booking_id and passenger_id = auth.uid() for update;
  if b.id is null then raise exception 'Booking not found'; end if;
  if b.status not in ('requested','confirmed') then raise exception 'Booking cannot be cancelled from status %', b.status; end if;
  select * into r from public.rides where id = b.ride_id for update;
  if exists (select 1 from public.trips where ride_id = r.id and status = 'active') then raise exception 'Trip already in progress'; end if;
  update public.bookings set status = 'cancelled', cancelled_at = now() where id = b.id returning * into b;
  if r.status = 'active' then update public.rides set available_seats = available_seats + b.seats where id = r.id; end if;
  update public.payments set status = 'cancelled' where booking_id = b.id and status = 'pending';
  select name into p_name from public.profiles where id = auth.uid();
  perform public.notify(r.driver_id, 'booking_cancelled', 'Booking cancelled', coalesce(p_name,'A passenger') || ' cancelled their booking for ' || to_char(r.date, 'DD Mon') || '.');
  perform public.recompute_user_scores(auth.uid());
  return b;
end; $$;

-- ============ RATINGS ============
create or replace function public.submit_rating(_trip_id uuid, _to_user uuid, _score integer, _review text)
returns public.ratings language plpgsql security definer set search_path = public as $$
declare t public.trips; r public.rides; me uuid := auth.uid(); rt public.ratings; ok boolean := false;
begin
  if _score < 1 or _score > 5 then raise exception 'Score must be 1-5'; end if;
  select * into t from public.trips where id = _trip_id;
  if t.id is null then raise exception 'Trip not found'; end if;
  if t.status <> 'completed' then raise exception 'You can rate only after the trip is completed'; end if;
  select * into r from public.rides where id = t.ride_id;
  if r.driver_id = me then
    ok := exists (select 1 from public.bookings where ride_id = r.id and passenger_id = _to_user and status = 'completed');
  elsif _to_user = r.driver_id then
    ok := exists (select 1 from public.bookings where ride_id = r.id and passenger_id = me and status = 'completed');
  end if;
  if not ok then raise exception 'You can only rate participants of this trip'; end if;
  if exists (select 1 from public.ratings where trip_id = _trip_id and from_user_id = me and to_user_id = _to_user) then
    raise exception 'You already rated this user for this trip';
  end if;
  insert into public.ratings (trip_id, from_user_id, to_user_id, score, review) values (_trip_id, me, _to_user, _score, nullif(trim(_review),'')) returning * into rt;
  perform public.recompute_user_scores(_to_user);
  return rt;
end; $$;

-- ============ NOTIFICATIONS ============
create or replace function public.mark_notifications_read(_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null and (_ids is null or id = any(_ids))
$$;

-- ============ ADMIN ============
create or replace function public.admin_set_user_status(_user uuid, _status text, _reason text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if not public.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if _status not in ('active','suspended') then raise exception 'Invalid status'; end if;
  update public.profiles set account_status = _status where id = _user returning * into p;
  if p.id is null then raise exception 'User not found'; end if;
  if _status = 'suspended' then
    -- suspended drivers lose their open rides
    perform public.cancel_ride(r.id) from public.rides r where r.driver_id = _user and r.status = 'active'
      and not exists (select 1 from public.trips t where t.ride_id = r.id and t.status = 'active');
    update public.rides set status = 'cancelled' where driver_id = _user and status = 'draft';
  end if;
  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata)
    values (auth.uid(), case when _status = 'suspended' then 'suspend_user' else 'unsuspend_user' end, 'profile', _user, jsonb_build_object('reason', _reason));
  perform public.notify(_user, 'account', case when _status = 'suspended' then 'Account suspended' else 'Account reinstated' end,
    case when _status = 'suspended' then 'Your account has been suspended. Contact support for help.' else 'Your account is active again.' end);
  return p;
end; $$;

create or replace function public.admin_set_verification(_target_type text, _target uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if _status not in ('unverified','pending','verified') then raise exception 'Invalid status'; end if;
  if _target_type = 'profile' then update public.profiles set verification_status = _status where id = _target;
  elsif _target_type = 'vehicle' then update public.vehicles set verification_status = _status where id = _target;
  else raise exception 'Invalid target'; end if;
  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata)
    values (auth.uid(), 'set_verification', _target_type, _target, jsonb_build_object('status', _status));
end; $$;

create or replace function public.admin_resolve_report(_report uuid, _status text, _note text)
returns public.reports language plpgsql security definer set search_path = public as $$
declare rp public.reports;
begin
  if not public.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if _status not in ('open','reviewing','resolved','dismissed') then raise exception 'Invalid status'; end if;
  update public.reports set status = _status, resolved_at = case when _status in ('resolved','dismissed') then now() else null end
    where id = _report returning * into rp;
  if rp.id is null then raise exception 'Report not found'; end if;
  insert into public.admin_audit_logs (admin_id, action, target_type, target_id, metadata)
    values (auth.uid(), 'resolve_report', 'report', _report, jsonb_build_object('status', _status, 'note', _note));
  return rp;
end; $$;

create or replace function public.admin_metrics()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'drivers', (select count(distinct user_id) from public.vehicles),
    'suspended', (select count(*) from public.profiles where account_status = 'suspended'),
    'rides_active', (select count(*) from public.rides where status = 'active'),
    'rides_total', (select count(*) from public.rides),
    'bookings_total', (select count(*) from public.bookings),
    'bookings_confirmed', (select count(*) from public.bookings where status in ('confirmed','completed')),
    'trips_completed', (select count(*) from public.trips where status = 'completed'),
    'open_reports', (select count(*) from public.reports where status in ('open','reviewing')),
    'gross_volume', (select coalesce(sum(gross_amount),0) from public.payments where status not in ('cancelled','failed','refunded')),
    'platform_fees', (select coalesce(sum(platform_fee),0) from public.payments where status not in ('cancelled','failed','refunded'))
  ) else null end
$$;

-- ============ STORAGE: profile photos ============
create policy "avatars_public_read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_upload_own" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_update_own" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);