-- Extends profiles with a bio and a "default new trips to public" preference,
-- and adds saved-cities / favorite-activities bookmarking. Run once in the
-- Supabase SQL Editor.

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
