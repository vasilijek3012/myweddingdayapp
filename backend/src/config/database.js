const { Pool } = require('pg');
const logger = require('./logger');

// Railway's Postgres plugin (and most managed Postgres hosts) provide a single DATABASE_URL
// connection string rather than discrete host/port/user vars — prefer that when set, and fall
// back to the DB_* vars for local dev (backend/.env), so neither setup needs extra mapping.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'myweddingday',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });

async function getPool() {
  return pool;
}

async function initializeDatabase() {
  const db = await getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS Users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255),
      full_name VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'visitor' CHECK (role IN ('owner', 'visitor', 'band')),
      google_id VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Migrate an existing Users table created before Google Sign-In was added:
  // password_hash used to be NOT NULL, but Google-only accounts never set one.
  await db.query(`ALTER TABLE Users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE`);
  await db.query(`ALTER TABLE Users ALTER COLUMN password_hash DROP NOT NULL`);

  await db.query(`
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
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS MealPlans (
      id SERIAL PRIMARY KEY,
      venue_id INTEGER NOT NULL REFERENCES Venues(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price_per_person DECIMAL(10,2) NOT NULL,
      includes_drinks BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
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
    )
  `);

  await db.query(`
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
    )
  `);

  // One review per user per venue/band — partial indexes since a plain UNIQUE(user_id,
  // venue_id, band_id) wouldn't work here (NULL never equals NULL in a unique constraint).
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_venue_uq ON Reviews(user_id, venue_id) WHERE venue_id IS NOT NULL
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_band_uq ON Reviews(user_id, band_id) WHERE band_id IS NOT NULL
  `);

  await db.query(`
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
    )
  `);

  logger.info('Database initialized successfully');
}

module.exports = { getPool, initializeDatabase, pool };
