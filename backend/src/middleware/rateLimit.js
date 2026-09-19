const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedis } = require('../config/redis');

// Redis-backed so limits are shared across multiple backend instances (the whole point of
// centralizing rate-limit state instead of each instance counting in its own memory) — but
// falls back to express-rate-limit's built-in in-memory store if Redis isn't configured, so
// rate limiting still works (per-instance only) rather than silently disabling itself.
function makeLimiter({ windowMs, max, message }) {
  const redis = getRedis();

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    store: redis
      ? new RedisStore({ sendCommand: (...args) => redis.call(...args) })
      : undefined,
  });
}

// Auth endpoints — the classic brute-force target.
const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many attempts, please try again later',
});

// Write endpoints that are cheap to spam otherwise (reviews, checkout creation).
const writeLimiter = makeLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many requests, please slow down',
});

module.exports = { authLimiter, writeLimiter };
