/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.createTable('payments', {
    id: 'id',
    user_id: { type: 'integer', notNull: true, references: 'users', onDelete: 'CASCADE' },
    venue_id: { type: 'integer', references: 'venues', onDelete: 'CASCADE' },
    band_id: { type: 'integer', references: 'bands', onDelete: 'CASCADE' },
    stripe_session_id: { type: 'varchar(255)' },
    stripe_payment_intent_id: { type: 'varchar(255)' },
    amount: { type: 'decimal(10,2)', notNull: true },
    currency: { type: 'varchar(3)', notNull: true, default: 'usd' },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
      check: "status IN ('pending', 'completed', 'failed', 'refunded')",
    },
    created_at: { type: 'timestamp', default: pgm.func('now()') },
    completed_at: { type: 'timestamp' },
  });

  pgm.addConstraint('payments', 'payments_venue_xor_band', {
    check: '(venue_id IS NOT NULL AND band_id IS NULL) OR (venue_id IS NULL AND band_id IS NOT NULL)',
  });
};

exports.down = (pgm) => {
  pgm.dropTable('payments');
};
