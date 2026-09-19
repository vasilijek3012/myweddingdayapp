const express = require('express');
const { getPool } = require('../config/database');
const { getStripe } = require('../config/stripe');
const { cacheInvalidate } = require('../config/redis');
const logger = require('../config/logger');

const router = express.Router();

// POST /api/webhooks/stripe — mounted in server.js with express.raw() BEFORE the global
// express.json() parser, since Stripe's signature verification needs the exact raw body.
router.post('/stripe', async (req, res) => {
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return res.status(503).send(err.message);
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('STRIPE_WEBHOOK_SECRET is not configured');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error({ err: err.message }, 'Stripe webhook signature verification failed');
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    try {
      await handleCheckoutCompleted(event.data.object);
    } catch (err) {
      logger.error({ err }, 'Error handling checkout.session.completed');
      // Still ack the webhook — Stripe would otherwise retry indefinitely on our bug, not theirs.
    }
  }

  res.json({ received: true });
});

async function handleCheckoutCompleted(session) {
  const paymentId = session.metadata?.payment_id;
  if (!paymentId) return;

  const pool = await getPool();
  const payment = await pool.query(
    `SELECT id, venue_id, band_id FROM Payments WHERE id = $1 AND status = 'pending'`,
    [paymentId]
  );
  if (payment.rows.length === 0) return; // already processed, or unknown — nothing to do

  const { venue_id, band_id } = payment.rows[0];

  await pool.query(
    `UPDATE Payments SET status = 'completed', completed_at = NOW(), stripe_payment_intent_id = $1 WHERE id = $2`,
    [session.payment_intent, paymentId]
  );

  // Flat one-time fee → featured "forever" rather than a real expiry (see CLAUDE.md).
  const farFuture = new Date();
  farFuture.setFullYear(farFuture.getFullYear() + 100);

  if (venue_id) {
    await pool.query(`UPDATE Venues SET plan = 'featured', featured_until = $1 WHERE id = $2`, [farFuture, venue_id]);
    await cacheInvalidate('venues:list:');
    await cacheInvalidate(`venues:detail:${venue_id}`);
  } else if (band_id) {
    await pool.query(`UPDATE Bands SET plan = 'featured', featured_until = $1 WHERE id = $2`, [farFuture, band_id]);
    await cacheInvalidate('bands:list:');
    await cacheInvalidate(`bands:detail:${band_id}`);
  }
}

module.exports = router;
