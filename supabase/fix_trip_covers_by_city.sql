-- Fixes trips that got a generic vibe-themed cover photo (from the earlier
-- backfill_trip_covers.sql) by replacing it with a real photo of the trip's
-- actual destination city, wherever we can determine one. Run once in the
-- Supabase SQL Editor, safe to re-run.

-- List of the generic fallback URLs from CreateTrip.tsx / backfill_trip_covers.sql
-- — only trips still on one of these get touched; anything the user manually
-- uploaded is left alone.
with generic_covers as (
  select unnest(array[
    'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1476234251651-f353703a034d?auto=format&fit=crop&w=800&q=70',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=70'
  ]) as url
),
-- Trips that already have a stop: use that stop's real city photo.
from_stops as (
  select distinct on (ts.trip_id)
    ts.trip_id,
    ci.image_url
  from trip_stops ts
  join cities ci on ci.id = ts.city_id
  where ci.image_url is not null
  order by ts.trip_id, ts.order_index asc
),
-- Trips with no stops yet: guess the city from the trip name (e.g. "Ahmedabad
-- Trip" -> "Ahmedabad"), picking the most popular matching city if several.
from_name as (
  select distinct on (t.id)
    t.id as trip_id,
    ci.image_url
  from trips t
  join cities ci on t.name ilike '%' || ci.name || '%' and ci.image_url is not null
  where t.id not in (select trip_id from from_stops)
  order by t.id, ci.popularity desc
)
update trips t
set cover_photo_url = coalesce(fs.image_url, fn.image_url)
from generic_covers gc
left join from_stops fs on fs.trip_id = t.id
left join from_name fn on fn.trip_id = t.id
where (t.cover_photo_url = gc.url or t.cover_photo_url is null)
  and coalesce(fs.image_url, fn.image_url) is not null;
