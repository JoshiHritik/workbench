-- Additional seed cities (India). Run once in the Supabase SQL Editor, same as schema.sql.

insert into cities (name, country, cost_index, popularity, image_url)
select * from (values
  ('Delhi', 'India', 35, 96, null::text),
  ('Jaipur', 'India', 30, 89, null::text),
  ('Mumbai', 'India', 40, 93, null::text),
  ('Goa', 'India', 38, 91, null::text)
) as seed(name, country, cost_index, popularity, image_url)
where not exists (select 1 from cities where cities.name = seed.name);
