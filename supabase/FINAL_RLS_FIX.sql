-- Run this once in the Supabase SQL Editor. This is the ACTUAL root cause.
--
-- The real cycle: trips' SELECT policy checks `EXISTS (select 1 from
-- shared_links where shared_links.trip_id = trips.id)`. shared_links has a
-- "for all" policy ("Shared links are writable by the trip owner"), and
-- FOR ALL applies to SELECT too — so reading shared_links re-evaluates that
-- policy, whose condition is `EXISTS (select 1 from trips where trips.id =
-- shared_links.trip_id and trips.user_id = auth.uid())`. That's a query on
-- trips, which re-evaluates trips' SELECT policy, which queries
-- shared_links again — forever. Two tables' policies calling into each
-- other, not a single self-referencing one, which is why the earlier
-- single-table fixes didn't help.
--
-- Fix: shared_links' SELECT access is already fully covered by "Shared
-- links are publicly readable" (using true), so the owner-only policy only
-- needs to gate insert/update/delete, not select.

drop policy if exists "Shared links are writable by the trip owner" on shared_links;

create policy "Shared links are insertable by the trip owner"
  on shared_links for insert
  with check (
    exists (select 1 from trips where trips.id = shared_links.trip_id and trips.user_id = auth.uid())
  );

create policy "Shared links are updatable by the trip owner"
  on shared_links for update
  using (
    exists (select 1 from trips where trips.id = shared_links.trip_id and trips.user_id = auth.uid())
  );

create policy "Shared links are deletable by the trip owner"
  on shared_links for delete
  using (
    exists (select 1 from trips where trips.id = shared_links.trip_id and trips.user_id = auth.uid())
  );
