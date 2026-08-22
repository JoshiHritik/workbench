-- Prep for importing the full world-cities dataset (see README below).
-- Run this FIRST in the Supabase SQL Editor, before importing world_cities.csv.

-- Fast substring search on city name (used by the search-suggestions dropdown).
create extension if not exists pg_trgm;
create index if not exists cities_name_trgm_idx on cities using gin (name gin_trgm_ops);
create index if not exists cities_popularity_idx on cities (popularity desc);

-- Our 10 curated (photographed) cities were seeded with a hand-picked 0-100
-- "popularity" score. The bulk import uses real population as popularity,
-- which is a much bigger scale — rescale the curated rows so they stay
-- competitive in "top by popularity" queries instead of getting buried
-- under every bulk-imported city with a population over a few hundred.
-- (Approximate metro-area populations, not exact.)
update cities set popularity = 32000000 where name = 'Delhi';
update cities set popularity = 3900000  where name = 'Jaipur';
update cities set popularity = 20000000 where name = 'Mumbai';
update cities set popularity = 1500000  where name = 'Goa';
update cities set popularity = 11000000 where name = 'Paris';
update cities set popularity = 37000000 where name = 'Tokyo';
update cities set popularity = 4300000  where name = 'Bali';
update cities set popularity = 8800000  where name = 'New York City';
update cities set popularity = 4300000  where name = 'Rome';
update cities set popularity = 10500000 where name = 'Bangkok';
