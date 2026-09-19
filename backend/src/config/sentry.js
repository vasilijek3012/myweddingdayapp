const Sentry = require('@sentry/node');
const logger = require('./logger');

let initialized = false;

// No-op entirely if SENTRY_DSN isn't set — same inert-until-configured pattern as
// config/stripe.js and config/google.js. Call this once, before anything else touches
// Express, so Sentry can instrument requests from the start.
function initSentry() {
  if (!process.env.SENTRY_DSN) return false;
  if (initialized) return true;

  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
  initialized = true;
  logger.info('Sentry error tracking initialized');
  return true;
}

module.exports = { initSentry, Sentry };
