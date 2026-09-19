-- MyWeddingDay — dummy data so /deals, /weddings, /prewedding and /bands have something to show.
--
-- Run after schema.sql (or after the backend has auto-created the tables on first boot):
--   psql -U postgres -d myweddingday -f seed-data.sql
--
-- All seeded accounts share the password:  Password123!
-- (hashed below with bcrypt/12 rounds, the same settings backend/src/routes/auth.js uses,
-- so you can actually log in as any of them through the normal /login flow.)

-- ---------------------------------------------------------------------------
-- Users (vendors only — visitors don't have accounts in this product model)
-- ---------------------------------------------------------------------------
INSERT INTO Users (email, password_hash, full_name, role) VALUES
  ('sophia.owner@example.com',   '$2a$12$5.AxD.YKlTASqeWNUHa7puvTLTIlpC6rpzlXmf3RThUWmUbRIcjRK', 'Sophia Bennett',        'owner'),
  ('marcus.owner@example.com',   '$2a$12$5.AxD.YKlTASqeWNUHa7puvTLTIlpC6rpzlXmf3RThUWmUbRIcjRK', 'Marcus Diallo',         'owner'),
  ('nova.band@example.com',      '$2a$12$5.AxD.YKlTASqeWNUHa7puvTLTIlpC6rpzlXmf3RThUWmUbRIcjRK', 'Nova Sound',            'band'),
  ('reverie.band@example.com',   '$2a$12$5.AxD.YKlTASqeWNUHa7puvTLTIlpC6rpzlXmf3RThUWmUbRIcjRK', 'The Reverie Collective','band'),
  ('echoline.band@example.com',  '$2a$12$5.AxD.YKlTASqeWNUHa7puvTLTIlpC6rpzlXmf3RThUWmUbRIcjRK', 'Echoline Strings',      'band'),
  ('highnoon.band@example.com',  '$2a$12$5.AxD.YKlTASqeWNUHa7puvTLTIlpC6rpzlXmf3RThUWmUbRIcjRK', 'High Noon Brass',       'band')
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Venues (owner_id looked up by email so this file is safe to re-run)
-- ---------------------------------------------------------------------------
INSERT INTO Venues (owner_id, name, type, description, address, city, latitude, longitude, capacity, base_price, phone, website, image_url)
SELECT id, 'The Grand Willow Estate', 'wedding',
       'A restored 1890s estate with manicured gardens and a glass-walled reception hall. Capacity for large, formal weddings.',
       '4820 Willow Creek Rd', 'Austin', 30.2672, -97.7431, 220, 8500.00,
       '512-555-0142', 'https://grandwillowestate.example.com', 'https://picsum.photos/seed/grandwillow/800/600'
FROM Users WHERE email = 'sophia.owner@example.com'
AND NOT EXISTS (SELECT 1 FROM Venues WHERE name = 'The Grand Willow Estate');

INSERT INTO Venues (owner_id, name, type, description, address, city, latitude, longitude, capacity, base_price, phone, website, image_url)
SELECT id, 'Willow Garden Retreat', 'prewedding',
       'An intimate garden courtyard for bachelor/bachelorette parties and rehearsal dinners, steps from the main estate.',
       '4822 Willow Creek Rd', 'Austin', 30.2669, -97.7428, 40, 1800.00,
       '512-555-0143', 'https://grandwillowestate.example.com/garden', 'https://picsum.photos/seed/willowgarden/800/600'
FROM Users WHERE email = 'sophia.owner@example.com'
AND NOT EXISTS (SELECT 1 FROM Venues WHERE name = 'Willow Garden Retreat');

INSERT INTO Venues (owner_id, name, type, description, address, city, latitude, longitude, capacity, base_price, phone, website, image_url)
SELECT id, 'Lakeside Manor', 'wedding',
       'Waterfront manor with a private dock and floor-to-ceiling views of the lake at sunset.',
       '110 Shoreline Dr', 'Denver', 39.7392, -104.9903, 180, 7200.00,
       '303-555-0117', 'https://lakesidemanor.example.com', 'https://picsum.photos/seed/lakesidemanor/800/600'
FROM Users WHERE email = 'marcus.owner@example.com'
AND NOT EXISTS (SELECT 1 FROM Venues WHERE name = 'Lakeside Manor');

INSERT INTO Venues (owner_id, name, type, description, address, city, latitude, longitude, capacity, base_price, phone, website, image_url)
SELECT id, 'Rustic Barn Getaway', 'wedding',
       'Converted timber barn on 40 acres, string lights and an open-air ceremony field.',
       '2201 County Road 9', 'Boulder', 40.0150, -105.2705, 150, 6000.00,
       '303-555-0188', 'https://rusticbarngetaway.example.com', 'https://picsum.photos/seed/rusticbarn/800/600'
FROM Users WHERE email = 'marcus.owner@example.com'
AND NOT EXISTS (SELECT 1 FROM Venues WHERE name = 'Rustic Barn Getaway');

INSERT INTO Venues (owner_id, name, type, description, address, city, latitude, longitude, capacity, base_price, phone, website, image_url)
SELECT id, 'Downtown Loft Suite', 'prewedding',
       'Industrial-chic rooftop loft for engagement parties and small pre-wedding gatherings.',
       '900 2nd Ave', 'Seattle', 47.6062, -122.3321, 30, 1500.00,
       '206-555-0199', 'https://downtownloftsuite.example.com', 'https://picsum.photos/seed/downtownloft/800/600'
FROM Users WHERE email = 'marcus.owner@example.com'
AND NOT EXISTS (SELECT 1 FROM Venues WHERE name = 'Downtown Loft Suite');

-- ---------------------------------------------------------------------------
-- Meal plans
-- ---------------------------------------------------------------------------
INSERT INTO MealPlans (venue_id, name, description, price_per_person, includes_drinks)
SELECT id, 'Classic Plated Dinner', 'Three-course plated dinner with a choice of two entrees.', 95.00, TRUE
FROM Venues WHERE name = 'The Grand Willow Estate'
AND NOT EXISTS (SELECT 1 FROM MealPlans mp WHERE mp.venue_id = Venues.id AND mp.name = 'Classic Plated Dinner');

INSERT INTO MealPlans (venue_id, name, description, price_per_person, includes_drinks)
SELECT id, 'Garden Buffet', 'Seasonal buffet stations, vegetarian options included.', 75.00, FALSE
FROM Venues WHERE name = 'The Grand Willow Estate'
AND NOT EXISTS (SELECT 1 FROM MealPlans mp WHERE mp.venue_id = Venues.id AND mp.name = 'Garden Buffet');

INSERT INTO MealPlans (venue_id, name, description, price_per_person, includes_drinks)
SELECT id, 'Lakeside Feast', 'Multi-course dinner featuring local seafood, paired wines included.', 110.00, TRUE
FROM Venues WHERE name = 'Lakeside Manor'
AND NOT EXISTS (SELECT 1 FROM MealPlans mp WHERE mp.venue_id = Venues.id AND mp.name = 'Lakeside Feast');

INSERT INTO MealPlans (venue_id, name, description, price_per_person, includes_drinks)
SELECT id, 'Standard Buffet', 'Classic buffet with carving station and salad bar.', 68.00, FALSE
FROM Venues WHERE name = 'Lakeside Manor'
AND NOT EXISTS (SELECT 1 FROM MealPlans mp WHERE mp.venue_id = Venues.id AND mp.name = 'Standard Buffet');

INSERT INTO MealPlans (venue_id, name, description, price_per_person, includes_drinks)
SELECT id, 'BBQ Buffet', 'Smoked brisket and pulled pork buffet with all the sides.', 55.00, FALSE
FROM Venues WHERE name = 'Rustic Barn Getaway'
AND NOT EXISTS (SELECT 1 FROM MealPlans mp WHERE mp.venue_id = Venues.id AND mp.name = 'BBQ Buffet');

-- ---------------------------------------------------------------------------
-- Bands
-- ---------------------------------------------------------------------------
INSERT INTO Bands (owner_id, name, genre, description, city, price_per_event, phone, website, image_url)
SELECT id, 'Nova Sound', 'Pop / Rock',
       'Five-piece cover band specializing in first dances and packed dance floors.',
       'Austin', 1200.00, '512-555-0301', 'https://novasound.example.com', 'https://picsum.photos/seed/novasound/800/600'
FROM Users WHERE email = 'nova.band@example.com'
AND NOT EXISTS (SELECT 1 FROM Bands WHERE name = 'Nova Sound');

INSERT INTO Bands (owner_id, name, genre, description, city, price_per_event, phone, website, image_url)
SELECT id, 'The Reverie Collective', 'Jazz',
       'Jazz trio/quartet for ceremonies and cocktail hours, standards and modern arrangements.',
       'Denver', 950.00, '303-555-0322', 'https://reveriecollective.example.com', 'https://picsum.photos/seed/reveriecollective/800/600'
FROM Users WHERE email = 'reverie.band@example.com'
AND NOT EXISTS (SELECT 1 FROM Bands WHERE name = 'The Reverie Collective');

INSERT INTO Bands (owner_id, name, genre, description, city, price_per_event, phone, website, image_url)
SELECT id, 'Echoline Strings', 'Classical / String Quartet',
       'String quartet for ceremonies, available for classical repertoire or modern song arrangements.',
       'Seattle', 800.00, '206-555-0355', 'https://echolinestrings.example.com', 'https://picsum.photos/seed/echolinestrings/800/600'
FROM Users WHERE email = 'echoline.band@example.com'
AND NOT EXISTS (SELECT 1 FROM Bands WHERE name = 'Echoline Strings');

INSERT INTO Bands (owner_id, name, genre, description, city, price_per_event, phone, website, image_url)
SELECT id, 'High Noon Brass', 'Brass / Swing',
       'High-energy swing and brass band for receptions, second-line send-offs a specialty.',
       'Boulder', 1100.00, '303-555-0377', 'https://highnoonbrass.example.com', 'https://picsum.photos/seed/highnoonbrass/800/600'
FROM Users WHERE email = 'highnoon.band@example.com'
AND NOT EXISTS (SELECT 1 FROM Bands WHERE name = 'High Noon Brass');
