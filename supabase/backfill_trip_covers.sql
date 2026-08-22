-- One-time backfill: gives every existing trip that has no cover photo a
-- fallback image, matching the same vibe->image mapping CreateTrip.tsx uses
-- for new trips. Run once in the Supabase SQL Editor.

update trips
set cover_photo_url = case trip_vibe
  when 'Adventure' then 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=70'
  when 'Relaxing'  then 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=70'
  when 'Cultural'  then 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=70'
  when 'Beach'     then 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=70'
  when 'Romantic'  then 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=70'
  when 'Family'    then 'https://images.unsplash.com/photo-1476234251651-f353703a034d?auto=format&fit=crop&w=800&q=70'
  else 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=70'
end
where cover_photo_url is null;
