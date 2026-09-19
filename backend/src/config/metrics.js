const client = require('prom-client');

// Standard process/runtime metrics (CPU, memory, event loop lag, GC) for free.
client.collectDefaultMetrics({ prefix: 'myweddingday_' });

const httpRequestDuration = new client.Histogram({
  name: 'myweddingday_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

const httpRequestsTotal = new client.Counter({
  name: 'myweddingday_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const cacheHitsTotal = new client.Counter({
  name: 'myweddingday_cache_hits_total',
  help: 'Redis cache hits',
  labelNames: ['route'],
});

const cacheMissesTotal = new client.Counter({
  name: 'myweddingday_cache_misses_total',
  help: 'Redis cache misses',
  labelNames: ['route'],
});

// Express middleware — records duration/count for every request, labeled by route pattern
// (e.g. "/api/venues/:id", not the literal URL) so cardinality stays bounded regardless of
// how many distinct venue IDs get requested.
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);

    const cacheHeader = res.getHeader('X-Cache');
    if (cacheHeader === 'HIT') cacheHitsTotal.inc({ route });
    else if (cacheHeader === 'MISS') cacheMissesTotal.inc({ route });
  });
  next();
}

module.exports = { client, metricsMiddleware };
