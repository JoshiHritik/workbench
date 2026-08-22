-- One-shot emergency fix. Run this ENTIRE file once in the Supabase SQL
-- Editor. It is safe to run multiple times.
--
-- What it does:
-- 1. Adds the missing profiles.bio / profiles.default_public columns and the
--    saved_cities / favorite_activities tables (fixes the 400 on
--    profiles?select=default_public and the 404 on saved_cities).
-- 2. Drops EVERY existing policy on `trips` and `profiles`, whatever they're
--    named, then recreates only the known-correct set. This is the
--    heavy-handed fix for the recurring "infinite recursion detected in
--    policy for relation trips" (42P17) error — if a stray/duplicate policy
--    was created outside these migration files (e.g. by hand in the Studio
--    UI) it would keep causing recursion even after the targeted fix, since
--    that fix only dropped policies it knew the exact name of. Dropping
--    everything and rebuilding removes that blind spot.

-- ── profile extras ──────────────────────────────────────────────────────────
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists default_public boolean not null default false;

create table if not exists saved_cities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  city_name text not null,
  city_state text,
  city_country text,
  image_url text,
  created_at timestamptz not null default now(),
  unique (user_id, city_name, city_country)
);
alter table saved_cities enable row level security;
drop policy if exists "Users manage their own saved cities" on saved_cities;
create policy "Users manage their own saved cities"
  on saved_cities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists favorite_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, activity_id)
);
alter table favorite_activities enable row level security;
drop policy if exists "Users manage their own favorite activities" on favorite_activities;
create policy "Users manage their own favorite activities"
  on favorite_activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── admin-check function (SECURITY DEFINER, breaks the recursion cycle) ────
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- ── nuke every existing policy on trips and profiles ────────────────────────
do $$
declare
  pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'trips' loop
    execute format('drop policy if exists %I on public.trips', pol.policyname);
  end loop;
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles' loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end $$;

-- ── rebuild the correct policy set ──────────────────────────────────────────
create policy "Trips are readable by their owner, if public, or via a share link"
  on trips for select
  using (
    auth.uid() = user_id
    or is_public = true
    or exists (select 1 from shared_links where shared_links.trip_id = trips.id)
  );

create policy "Trips are insertable by their owner"
  on trips for insert with check (auth.uid() = user_id);

create policy "Trips are editable by their owner"
  on trips for update using (auth.uid() = user_id);

create policy "Trips are deletable by their owner"
  on trips for delete using (auth.uid() = user_id);

create policy "Admins can read all trips"
  on trips for select
  using (public.is_admin_user());

create policy "Profiles are viewable by their owner"
  on profiles for select using (auth.uid() = id);

create policy "Profiles are editable by their owner"
  on profiles for update using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select
  using (public.is_admin_user());

drop policy if exists "Admins can delete any review" on activity_reviews;
create policy "Admins can delete any review"
  on activity_reviews for delete
  using (public.is_admin_user());
