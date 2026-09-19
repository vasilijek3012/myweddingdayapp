const Redis = require('ioredis');
const logger = require('./logger');

let client = null;
let disabledLogged = false;

// Redis is optional infrastructure, not a hard dependency: if REDIS_URL isn't set, or the
// connection fails, every helper below becomes a no-op instead of throwing. Caching then
// simply falls back to hitting Postgres directly, rate limiting falls back to in-memory,
// and JWT logout/revocation is skipped — the app stays fully functional, just without those
// optimizations. This is deliberate graceful degradation, not an oversight.
function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;

  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // don't keep retrying forever — fail fast, fall back to no-cache
    lazyConnect: false,
  });

  client.on('error', (err) => {
    if (!disabledLogged) {
      logger.warn({ err: err.message }, 'Redis unavailable — continuing without cache/rate-limit/revocation');
      disabledLogged = true;
    }
  });

  return client;
}

async function cacheGet(key) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // cache write failures are never fatal — the request already has its data
  }
}

// Deletes every key under a prefix (e.g. all cached venue list pages). Fine at this app's
// scale — SCAN is non-blocking — but a busier system would prefer short TTLs plus versioned
// cache keys (bump a "venues:v2:..." prefix) over pattern deletion, to avoid SCAN entirely.
async function cacheInvalidate(prefix) {
  const redis = getRedis();
  if (!redis) return;
  try {
    const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
    const keys = [];
    for await (const batch of stream) keys.push(...batch);
    if (keys.length) await redis.del(keys);
  } catch {
    // best-effort — a stale cache entry expires on its own via TTL anyway
  }
}

module.exports = { getRedis, cacheGet, cacheSet, cacheInvalidate };
