-- GlobeTrotter schema
-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query).

-- ── profiles ────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Profiles are viewable by their owner"
  on profiles for select using (auth.uid() = id);

create policy "Profiles are editable by their owner"
  on profiles for update using (auth.uid() = id);

-- auto-create a profile row whenever a new auth user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── cities & activities (reference/catalog data) ───────────────────────────
create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null,
  cost_index numeric,
  popularity int default 0,
  image_url text
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id) on delete cascade,
  name text not null,
  category text,
  cost numeric default 0,
  duration_minutes int,
  description text,
  image_url text
);

alter table cities enable row level security;
alter table activities enable row level security;

create policy "Cities are publicly readable" on cities for select using (true);
create policy "Activities are publicly readable" on activities for select using (true);

-- ── trips & itinerary ───────────────────────────────────────────────────────
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  description text,
  cover_photo_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  city_id uuid not null references cities(id),
  arrival_date date,
  departure_date date,
  order_index int not null default 0
);

create table if not exists trip_activities (
  id uuid primary key default gen_random_uuid(),
  trip_stop_id uuid not null references trip_stops(id) on delete cascade,
  activity_id uuid not null references activities(id),
  scheduled_date date,
  scheduled_time time,
  cost_override numeric
);

create table if not exists shared_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null unique references trips(id) on delete cascade,
  public_slug text not null unique default substr(md5(random()::text), 1, 10),
  created_at timestamptz not null default now()
);

alter table trips enable row level security;
alter table trip_stops enable row level security;
alter table trip_activities enable row level security;
alter table shared_links enable row level security;

-- trips: owners get full access; anyone can read a trip marked public
create policy "Trips are readable by their owner or if public"
  on trips for select using (auth.uid() = user_id or is_public = true);

create policy "Trips are insertable by their owner"
  on trips for insert with check (auth.uid() = user_id);

create policy "Trips are editable by their owner"
  on trips for update using (auth.uid() = user_id);

create policy "Trips are deletable by their owner"
  on trips for delete using (auth.uid() = user_id);

-- trip_stops: access follows the parent trip's visibility
create policy "Trip stops follow parent trip visibility"
  on trip_stops for select using (
    exists (
      select 1 from trips
      where trips.id = trip_stops.trip_id
      and (trips.user_id = auth.uid() or trips.is_public = true)
    )
  );

create policy "Trip stops are writable by the trip owner"
  on trip_stops for all using (
    exists (
      select 1 from trips
      where trips.id = trip_stops.trip_id and trips.user_id = auth.uid()
    )
  );

-- trip_activities: access follows the parent trip (via trip_stops) visibility
create policy "Trip activities follow parent trip visibility"
  on trip_activities for select using (
    exists (
      select 1 from trip_stops
      join trips on trips.id = trip_stops.trip_id
      where trip_stops.id = trip_activities.trip_stop_id
      and (trips.user_id = auth.uid() or trips.is_public = true)
    )
  );

create policy "Trip activities are writable by the trip owner"
  on trip_activities for all using (
    exists (
      select 1 from trip_stops
      join trips on trips.id = trip_stops.trip_id
      where trip_stops.id = trip_activities.trip_stop_id
      and trips.user_id = auth.uid()
    )
  );

-- shared_links: publicly readable (needed to resolve a slug), owner-managed
create policy "Shared links are publicly readable"
  on shared_links for select using (true);

create policy "Shared links are writable by the trip owner"
  on shared_links for all using (
    exists (
      select 1 from trips
      where trips.id = shared_links.trip_id and trips.user_id = auth.uid()
    )
  );

-- ── seed data (a handful of cities so the app isn't empty) ────────────────
insert into cities (name, country, cost_index, popularity, image_url)
select * from (values
  ('Paris', 'France', 85, 98, null::text),
  ('Tokyo', 'Japan', 80, 95, null::text),
  ('Bali', 'Indonesia', 45, 90, null::text),
  ('New York City', 'United States', 95, 97, null::text),
  ('Rome', 'Italy', 75, 92, null::text),
  ('Bangkok', 'Thailand', 40, 88, null::text)
) as seed(name, country, cost_index, popularity, image_url)
where not exists (select 1 from cities where cities.name = seed.name);
