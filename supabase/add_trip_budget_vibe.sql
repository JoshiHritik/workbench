-- Adds budget and vibe fields to trips, used by Create Trip and the
-- AI itinerary generator. Run once in the Supabase SQL Editor.

alter table trips add column if not exists budget numeric;
alter table trips add column if not exists trip_vibe text;
