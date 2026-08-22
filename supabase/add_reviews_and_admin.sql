-- Adds a real, first-party ratings/reviews system (not fabricated aggregate
-- ratings — actual reviews written by actual GlobeTrotter users), and an
-- is_admin flag plus the extra RLS policies an admin portal needs to read
-- (and moderate) data belonging to other users. Run once in the Supabase
-- SQL Editor.

-- ── reviews ─────────────────────────────────────────────────────────────────
-- Keyed by a normalized "name + city" string rather than a foreign key,
-- since activities can come from either the curated `activities` catalog or
-- an AI-generated itinerary (which isn't a real table row at all).
create table if not exists activity_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  activity_key text not null,
  activity_name text not null,
  city text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (user_id, activity_key)
);

alter table activity_reviews enable row level security;

drop policy if exists "Reviews are publicly readable" on activity_reviews;
create policy "Reviews are publicly readable"
  on activity_reviews for select using (true);

drop policy if exists "Users can write their own reviews" on activity_reviews;
create policy "Users can write their own reviews"
  on activity_reviews for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reviews" on activity_reviews;
create policy "Users can update their own reviews"
  on activity_reviews for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own reviews" on activity_reviews;
create policy "Users can delete their own reviews"
  on activity_reviews for delete using (auth.uid() = user_id);

create index if not exists activity_reviews_key_idx on activity_reviews (activity_key);

-- ── admin flag ──────────────────────────────────────────────────────────────
alter table profiles add column if not exists is_admin boolean not null default false;

-- After running this file, make yourself an admin by running (once):
--   update profiles set is_admin = true where id = auth.uid();
-- (run that line while logged in as yourself via the SQL editor's "Run as"
-- user, or just replace auth.uid() with your own user id from auth.users)

-- ── admin read/moderation access ───────────────────────────────────────────
-- These are ADDITIONAL select policies (Postgres OR's multiple policies for
-- the same command together), so regular users keep exactly the access they
-- already had — this only grants MORE visibility to rows where the caller
-- is flagged is_admin, it never takes anything away.
drop policy if exists "Admins can read all profiles" on profiles;
create policy "Admins can read all profiles"
  on profiles for select
  using (exists (select 1 from profiles admin_check where admin_check.id = auth.uid() and admin_check.is_admin = true));

drop policy if exists "Admins can read all trips" on trips;
create policy "Admins can read all trips"
  on trips for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));

drop policy if exists "Admins can delete any review" on activity_reviews;
create policy "Admins can delete any review"
  on activity_reviews for delete
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true));
