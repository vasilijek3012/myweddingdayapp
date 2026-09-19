const pino = require('pino');

// Structured JSON logs in production (one log aggregator away from being searchable/alertable),
// human-readable in dev. Replaces plain console.log/console.error across the backend.
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'production'
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
});

module.exports = logger;
