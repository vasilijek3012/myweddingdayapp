/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('users', {
    id: 'id',
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)' },
    full_name: { type: 'varchar(255)', notNull: true },
    role: { type: 'varchar(20)', notNull: true, default: 'visitor', check: "role IN ('owner', 'visitor', 'band')" },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
  });

  pgm.createTable('venues', {
    id: 'id',
    owner_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    type: { type: 'varchar(20)', notNull: true, check: "type IN ('wedding', 'prewedding')" },
    description: { type: 'text' },
    address: { type: 'varchar(500)' },
    city: { type: 'varchar(100)' },
    latitude: { type: 'double precision' },
    longitude: { type: 'double precision' },
    capacity: { type: 'integer' },
    base_price: { type: 'decimal(10,2)' },
    phone: { type: 'varchar(50)' },
    website: { type: 'varchar(255)' },
    image_url: { type: 'varchar(500)' },
    is_active: { type: 'boolean', default: true },
    plan: { type: 'varchar(20)', notNull: true, default: 'free' },
    featured_until: { type: 'timestamp' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
  });

  pgm.createTable('mealplans', {
    id: 'id',
    venue_id: { type: 'integer', notNull: true, references: 'venues', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    price_per_person: { type: 'decimal(10,2)', notNull: true },
    includes_drinks: { type: 'boolean', default: false },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
  });

  pgm.createTable('bands', {
    id: 'id',
    owner_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    name: { type: 'varchar(255)', notNull: true },
    genre: { type: 'varchar(100)' },
    description: { type: 'text' },
    city: { type: 'varchar(100)' },
    price_per_event: { type: 'decimal(10,2)' },
    phone: { type: 'varchar(50)' },
    website: { type: 'varchar(255)' },
    image_url: { type: 'varchar(500)' },
    is_active: { type: 'boolean', default: true },
    plan: { type: 'varchar(20)', notNull: true, default: 'free' },
    featured_until: { type: 'timestamp' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('mealplans');
  pgm.dropTable('bands');
  pgm.dropTable('venues');
  pgm.dropTable('users');
};
