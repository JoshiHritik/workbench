-- Security/bug fixes:
-- 1. A log table backing real rate limiting on the AI itinerary generator
--    (the Edge Function currently has no auth check and no rate limit at
--    all — anyone with the function URL could call it directly and burn
--    the OPENROUTER_API_KEY budget, authenticated or not).
-- 2. Fixes the trips SELECT policy: a trip with a share link but with
--    is_public left off was unreadable by anyone else, including via the
--    share link itself, since the policy only checked ownership OR
--    is_public — it never accounted for shared_links existing at all.
--
-- Run once in the Supabase SQL Editor.

create table if not exists itinerary_generation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table itinerary_generation_log enable row level security;

drop policy if exists "Users can read their own generation log" on itinerary_generation_log;
create policy "Users can read their own generation log"
  on itinerary_generation_log for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own generation log entries" on itinerary_generation_log;
create policy "Users can insert their own generation log entries"
  on itinerary_generation_log for insert
  with check (auth.uid() = user_id);

-- Index so the rate-limit lookup (recent rows for one user) stays fast.
create index if not exists itinerary_generation_log_user_created_idx
  on itinerary_generation_log (user_id, created_at desc);

drop policy if exists "Trips are readable by their owner or if public" on trips;
create policy "Trips are readable by their owner, if public, or via a share link"
  on trips for select
  using (
    auth.uid() = user_id
    or is_public = true
    or exists (select 1 from shared_links where shared_links.trip_id = trips.id)
  );
