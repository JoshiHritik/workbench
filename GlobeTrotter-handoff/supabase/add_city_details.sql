-- Adds a state column and photo/state data to existing cities.
-- Run once in the Supabase SQL Editor, same as the other supabase/*.sql files.

alter table cities add column if not exists state text;

update cities set state = 'Delhi', image_url = 'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'Delhi';
update cities set state = 'Rajasthan', image_url = 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'Jaipur';
update cities set state = 'Maharashtra', image_url = 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'Mumbai';
update cities set state = 'Goa', image_url = 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'Goa';
update cities set state = 'Île-de-France', image_url = 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'Paris';
update cities set state = 'Tokyo', image_url = 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'Tokyo';
update cities set state = 'Bali', image_url = 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'Bali';
update cities set state = 'New York', image_url = 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'New York City';
update cities set state = 'Lazio', image_url = 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'Rome';
update cities set state = 'Bangkok', image_url = 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=300&h=300&q=70'
  where name = 'Bangkok';
