#!/usr/bin/env node
// Thin wrapper so `npm run migrate:*` can reuse the same DB_HOST/DB_USER/etc. vars already
// in .env instead of duplicating them as a second DATABASE_URL. node-pg-migrate itself only
// understands a connection string, not discrete host/port/user vars.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { execFileSync } = require('child_process');

const password = encodeURIComponent(process.env.DB_PASSWORD || '');
process.env.DATABASE_URL = `postgres://${process.env.DB_USER}:${password}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const args = process.argv.slice(2);
execFileSync('npx', ['--no-install', 'node-pg-migrate', ...args], { stdio: 'inherit', env: process.env, shell: true });
