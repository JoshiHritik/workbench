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
--
-- The is_admin check goes through a SECURITY DEFINER function rather than a
-- raw subquery on `profiles`, because a policy ON profiles that subqueries
-- profiles directly causes Postgres to re-apply that same policy to the
-- subquery, forever — infinite recursion. A SECURITY DEFINER function's
-- internal query runs with the function owner's privileges, which bypasses
-- RLS and breaks that cycle.
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

drop policy if exists "Admins can read all profiles" on profiles;
create policy "Admins can read all profiles"
  on profiles for select
  using (public.is_admin_user());

drop policy if exists "Admins can read all trips" on trips;
create policy "Admins can read all trips"
  on trips for select
  using (public.is_admin_user());

drop policy if exists "Admins can delete any review" on activity_reviews;
create policy "Admins can delete any review"
  on activity_reviews for delete
  using (public.is_admin_user());
