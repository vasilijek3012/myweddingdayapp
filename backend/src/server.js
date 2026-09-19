require('dotenv').config();
const { initSentry, Sentry } = require('./config/sentry');
initSentry(); // must run before Express is created so it can auto-instrument everything

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const pinoHttp = require('pino-http');
const { initializeDatabase, pool } = require('./config/database');
const { getRedis } = require('./config/redis');
const { UPLOAD_DIR } = require('./middleware/upload');
const logger = require('./config/logger');
const { metricsMiddleware, client: promClient } = require('./config/metrics');

// FRONTEND_URL is also used by payments.js for Stripe's success/cancel redirect URLs — keep
// both in sync when you set this for a real deployment.
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

const authRoutes = require('./routes/auth');
const venueRoutes = require('./routes/venues');
const bandRoutes = require('./routes/bands');
const reviewRoutes = require('./routes/reviews');
const uploadRoutes = require('./routes/uploads');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3000;

// Railway (like most PaaS) puts the app behind a reverse proxy. Without this, req.ip is the
// proxy's own IP for every request (breaking per-client rate limiting — everyone would share
// one bucket) and req.protocol always reports "http" even over real HTTPS traffic (breaking
// the absolute URLs uploads.js builds from it). "1" trusts exactly one hop, matching Railway's
// setup — not a bare "true", which would trust an arbitrary X-Forwarded-For chain.
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(pinoHttp({ logger }));
app.use(metricsMiddleware);

// Mounted BEFORE express.json() — Stripe webhook signature verification needs the exact
// raw request body, which express.json() would otherwise have already parsed and consumed.
app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1y', immutable: true }));

// API versioning: every route is reachable at both the original unversioned path (kept for
// the current frontend, which still calls /api/...) and /api/v1/... . New breaking changes
// later go in a v2 router mounted alongside this one, instead of changing v1's behavior out
// from under existing clients.
function mountVersioned(path, router) {
  app.use(`/api${path}`, router);
  app.use(`/api/v1${path}`, router);
}

mountVersioned('/auth', authRoutes);
mountVersioned('/venues', venueRoutes);
mountVersioned('/bands', bandRoutes);
mountVersioned('/reviews', reviewRoutes);
mountVersioned('/uploads', uploadRoutes);
mountVersioned('/payments', paymentRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Prometheus scrape endpoint — not versioned, not under /api (it's infra, not product API).
// No auth on it here since this is a local dev app; in production this should be restricted
// to your monitoring network (firewall rule / separate internal port), not public.
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Must be registered after all routes, before any other error handler, so Sentry sees
// unhandled errors from route handlers. No-ops if SENTRY_DSN isn't set.
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

async function start() {
  try {
    await initializeDatabase();
    logger.info('Database connected successfully');
  } catch (err) {
    logger.warn({ err: err.message }, 'Database unavailable — server will start but all API calls will error until DB is connected');
  }

  const server = app.listen(PORT, () => logger.info(`Server running on http://localhost:${PORT}`));

  // Railway sends SIGTERM before killing the container on every redeploy/restart. Without
  // this, in-flight requests get cut off mid-response and DB/Redis connections are dropped
  // uncleanly instead of being closed. server.close() stops accepting new connections and
  // waits for in-flight ones to finish before we tear down pool/Redis underneath them.
  async function shutdown(signal) {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      try {
        await pool.end();
        const redis = getRedis();
        if (redis) await redis.quit();
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
      }
      logger.info('Shutdown complete');
      process.exit(0);
    });
    // Don't hang forever if something (a long-lived connection) never closes on its own.
    setTimeout(() => {
      logger.warn('Forcing shutdown after 10s timeout');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start();
