const CircuitBreaker = require('opossum');
const logger = require('../config/logger');

// Wraps a call to a third-party dependency (Stripe, Google) so that once it's failing
// repeatedly, we stop hammering it and fail fast instead — giving it time to recover and
// keeping our own event loop from filling up with slow/timed-out requests to a dependency
// that's already down. This is the classic circuit breaker pattern (see Netflix Hystrix,
// the library this is modeled on).
//
// States: CLOSED (normal — calls go through) → OPEN (failure threshold hit — calls fail
// instantly without even trying) → HALF-OPEN (after resetTimeout, one trial call is let
// through to check for recovery) → back to CLOSED or OPEN depending on the result.
function createBreaker(fn, { name, timeout = 8000, errorThresholdPercentage = 50, resetTimeout = 15000, errorFilter } = {}) {
  // errorFilter(err) => true means "don't count this toward the breaker" — for expected,
  // caller-caused failures (e.g. an invalid/expired token) rather than the dependency itself
  // being unhealthy. Without this, a wave of ordinary bad requests would trip the breaker and
  // lock out everyone, which is exactly backwards.
  const breaker = new CircuitBreaker(fn, { timeout, errorThresholdPercentage, resetTimeout, errorFilter });

  breaker.on('open', () => logger.warn({ breaker: name }, 'Circuit breaker OPEN — failing fast'));
  breaker.on('halfOpen', () => logger.info({ breaker: name }, 'Circuit breaker HALF-OPEN — testing recovery'));
  breaker.on('close', () => logger.info({ breaker: name }, 'Circuit breaker CLOSED — recovered'));
  breaker.on('timeout', () => logger.warn({ breaker: name }, 'Call timed out'));

  return breaker;
}

module.exports = { createBreaker };
