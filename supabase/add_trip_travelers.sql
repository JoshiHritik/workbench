-- Adds a "how many people are going" field to trips. Run once in the
-- Supabase SQL Editor.

alter table trips add column if not exists travelers int;
