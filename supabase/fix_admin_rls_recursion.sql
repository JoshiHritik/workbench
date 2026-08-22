-- Fixes infinite recursion in the admin-check RLS policies added by
-- add_reviews_and_admin.sql. Those policies checked is_admin by subquerying
-- `profiles` from within a policy defined ON `profiles` itself — Postgres
-- re-applies RLS to that inner subquery too, which re-triggers the same
-- policy, forever, until it errors out. This was breaking almost every
-- read in the app (profiles, trips, anything with an admin-visibility
-- policy), for every user, not just admins.
--
-- Standard fix: check is_admin through a SECURITY DEFINER function. Such a
-- function runs with the privileges of the function's owner (the role that
-- ran this migration), which — unless you've explicitly turned on FORCE ROW
-- LEVEL SECURITY somewhere, which this project never does — bypasses RLS
-- entirely for its own internal query, breaking the recursive cycle.
--
-- Run once in the Supabase SQL Editor. Safe to run even if you haven't run
-- add_reviews_and_admin.sql yet (this just becomes a no-op DROP + a
-- function definition that's ready for when you do).

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
