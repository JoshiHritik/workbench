-- Seed activities for the 10 curated cities, so Activity Search has
-- something real to show. Run once in the Supabase SQL Editor.

insert into activities (city_id, name, category, cost, duration_minutes, description, image_url)
select c.id, a.name, a.category, a.cost, a.duration_minutes, a.description, null
from (values
  ('Paris', 'Eiffel Tower Visit', 'Sightseeing', 30, 120, 'Skip-the-line access to the Eiffel Tower observation decks.'),
  ('Paris', 'Louvre Museum Tour', 'Culture', 20, 180, 'Guided walk through the Louvre''s highlights, including the Mona Lisa.'),
  ('Tokyo', 'Shibuya Crossing Walk', 'Sightseeing', 0, 60, 'Experience the world''s busiest pedestrian crossing.'),
  ('Tokyo', 'Sushi Making Class', 'Food', 80, 120, 'Hands-on sushi workshop with a local chef.'),
  ('Bali', 'Ubud Rice Terrace Trek', 'Adventure', 15, 180, 'Guided trek through the Tegalalang rice terraces.'),
  ('Bali', 'Beach Sunset Yoga', 'Relaxation', 10, 90, 'Evening yoga session on the beach at sunset.'),
  ('New York City', 'Statue of Liberty Ferry', 'Sightseeing', 25, 180, 'Ferry ride and grounds access to Liberty Island.'),
  ('New York City', 'Broadway Show', 'Nightlife', 120, 150, 'Ticket to a live Broadway theatre performance.'),
  ('Rome', 'Colosseum Guided Tour', 'Culture', 35, 120, 'Skip-the-line guided tour of the Colosseum and Roman Forum.'),
  ('Rome', 'Trastevere Food Walk', 'Food', 60, 150, 'Evening food tour through the Trastevere neighborhood.'),
  ('Bangkok', 'Grand Palace Tour', 'Culture', 15, 120, 'Guided tour of the Grand Palace and Wat Phra Kaew.'),
  ('Bangkok', 'Street Food Night Market', 'Food', 20, 120, 'Sampling tour of Bangkok''s best street food stalls.'),
  ('Delhi', 'India Gate Walk', 'Sightseeing', 0, 60, 'Self-guided walk around the India Gate war memorial.'),
  ('Delhi', 'Old Delhi Food Tour', 'Food', 25, 150, 'Street food crawl through the lanes of Old Delhi.'),
  ('Jaipur', 'Hawa Mahal & City Palace Tour', 'Culture', 20, 150, 'Guided tour of Jaipur''s iconic palaces.'),
  ('Jaipur', 'Amber Fort Elephant Ride', 'Adventure', 30, 90, 'Elephant ride up to the historic Amber Fort.'),
  ('Mumbai', 'Gateway of India Visit', 'Sightseeing', 0, 60, 'Visit the iconic Gateway of India monument.'),
  ('Mumbai', 'Marine Drive Sunset Walk', 'Relaxation', 0, 60, 'Evening stroll along Mumbai''s Marine Drive promenade.'),
  ('Goa', 'Beach Hopping Tour', 'Beach', 25, 240, 'Guided tour of Goa''s best beaches by boat and van.'),
  ('Goa', 'Water Sports Package', 'Adventure', 50, 180, 'Parasailing, jet-ski, and banana boat combo package.')
) as a(city_name, name, category, cost, duration_minutes, description)
join cities c on c.name = a.city_name
where not exists (
  select 1 from activities existing where existing.city_id = c.id and existing.name = a.name
);
