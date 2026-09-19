/* eslint-disable camelcase */

exports.up = (pgm) => {
  pgm.addColumn('users', {
    google_id: { type: 'varchar(255)', unique: true },
  });
  // Google-only accounts never set a password, so this can no longer be NOT NULL.
  pgm.alterColumn('users', 'password_hash', { notNull: false });
};

exports.down = (pgm) => {
  pgm.alterColumn('users', 'password_hash', { notNull: true });
  pgm.dropColumn('users', 'google_id');
};
