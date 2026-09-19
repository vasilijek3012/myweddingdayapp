-- MyWeddingDay — DDL for the live schema (PostgreSQL 16).
--
-- This is a manual-run mirror of what backend/src/config/database.js already creates
-- automatically on server boot (CREATE TABLE IF NOT EXISTS ...). You do NOT need to run
-- this by hand for local dev — starting the backend does it for you. Use this file when
-- you want to provision a fresh database (e.g. Railway) without booting the app first,
-- or just to read the schema in one place.
--
-- Run against an empty `myweddingday` database:
--   psql -U postgres -d myweddingday -f schema.sql

CREATE TABLE IF NOT EXISTS Users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),          -- nullable: Google-only accounts have no password
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'visitor' CHECK (role IN ('owner', 'visitor', 'band')),
  google_id VARCHAR(255) UNIQUE,       -- set once a user has signed in with Google
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Venues (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('wedding', 'prewedding')),
  description TEXT,
  address VARCHAR(500),
  city VARCHAR(100),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  capacity INTEGER,
  base_price DECIMAL(10,2),
  phone VARCHAR(50),
  website VARCHAR(255),
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  featured_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS MealPlans (
  id SERIAL PRIMARY KEY,
  venue_id INTEGER NOT NULL REFERENCES Venues(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_per_person DECIMAL(10,2) NOT NULL,
  includes_drinks BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Bands (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  description TEXT,
  city VARCHAR(100),
  price_per_event DECIMAL(10,2),
  phone VARCHAR(50),
  website VARCHAR(255),
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  featured_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  venue_id INTEGER REFERENCES Venues(id) ON DELETE CASCADE,
  band_id INTEGER REFERENCES Bands(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  CHECK ((venue_id IS NOT NULL AND band_id IS NULL) OR (venue_id IS NULL AND band_id IS NOT NULL))
);

-- One review per user per venue/band. A plain UNIQUE(user_id, venue_id, band_id) wouldn't
-- work here since NULL never equals NULL in a unique constraint — partial indexes instead.
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_venue_uq ON Reviews(user_id, venue_id) WHERE venue_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_band_uq ON Reviews(user_id, band_id) WHERE band_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS Payments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  venue_id INTEGER REFERENCES Venues(id) ON DELETE CASCADE,
  band_id INTEGER REFERENCES Bands(id) ON DELETE CASCADE,
  stripe_session_id VARCHAR(255),
  stripe_payment_intent_id VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'usd',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  CHECK ((venue_id IS NOT NULL AND band_id IS NULL) OR (venue_id IS NULL AND band_id IS NOT NULL))
);
