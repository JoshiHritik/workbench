-- Adds a language preference to profiles (avatar_url and the update
-- policy already exist from schema.sql). Run once in the SQL Editor.

alter table profiles add column if not exists language text not null default 'en';
