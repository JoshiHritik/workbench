-- Storage bucket for trip cover photos.
-- Run this once in the Supabase SQL Editor, same as schema.sql.

insert into storage.buckets (id, name, public)
values ('trip-covers', 'trip-covers', true)
on conflict (id) do nothing;

drop policy if exists "Trip cover images are publicly readable" on storage.objects;
create policy "Trip cover images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'trip-covers');

drop policy if exists "Users can upload their own trip covers" on storage.objects;
create policy "Users can upload their own trip covers"
  on storage.objects for insert
  with check (bucket_id = 'trip-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own trip covers" on storage.objects;
create policy "Users can update their own trip covers"
  on storage.objects for update
  using (bucket_id = 'trip-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own trip covers" on storage.objects;
create policy "Users can delete their own trip covers"
  on storage.objects for delete
  using (bucket_id = 'trip-covers' and (storage.foldername(name))[1] = auth.uid()::text);
