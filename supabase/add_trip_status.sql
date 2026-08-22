-- Adds a status column to trips (draft vs active), used by Create Trip's
-- "Save as draft" / "Save & Continue" actions. Run once in the Supabase SQL Editor.

alter table trips add column if not exists status text not null default 'draft';
