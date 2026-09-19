/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('reviews', {
    id: 'id',
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    venue_id: { type: 'integer', references: 'venues', onDelete: 'CASCADE' },
    band_id: { type: 'integer', references: 'bands', onDelete: 'CASCADE' },
    rating: { type: 'integer', notNull: true, check: 'rating BETWEEN 1 AND 5' },
    comment: { type: 'text' },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
    updated_at: { type: 'timestamp' },
  });

  pgm.addConstraint('reviews', 'reviews_venue_xor_band', {
    check: '(venue_id IS NOT NULL AND band_id IS NULL) OR (venue_id IS NULL AND band_id IS NOT NULL)',
  });

  // One review per user per venue/band. A plain UNIQUE(user_id, venue_id, band_id) wouldn't
  // work here since NULL never equals NULL in a unique constraint — partial indexes instead.
  pgm.createIndex('reviews', ['user_id', 'venue_id'], {
    unique: true,
    where: 'venue_id IS NOT NULL',
    name: 'reviews_user_venue_uq',
  });
  pgm.createIndex('reviews', ['user_id', 'band_id'], {
    unique: true,
    where: 'band_id IS NOT NULL',
    name: 'reviews_user_band_uq',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('reviews');
};
