const express = require('express');
const { getPool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { getStripe } = require('../config/stripe');
const { createBreaker } = require('../utils/circuitBreaker');
const logger = require('../config/logger');

const router = express.Router();

// Flat one-time fee to feature a listing (plan='featured', shown first in listings) —
// stays featured until manually removed, no expiry job needed. Used as a fallback price
// when STRIPE_PRICE_ID isn't set; set that env var instead if you want a specific Stripe
// Price object (e.g. for reporting) rather than this inline amount.
const FEATURE_LISTING_PRICE_CENTS = 999; // $9.99

// If Stripe's API is slow/down, fail fast after a few failures instead of letting every
// checkout request hang for the full timeout and pile up.
const createStripeSession = createBreaker(
  (stripe, params, options) => stripe.checkout.sessions.create(params, options),
  { name: 'stripe-checkout' }
);

// POST /api/payments/checkout — auth required, any role. Starts a Stripe Checkout session
// to feature the caller's own venue or band. Flat one-time fee (see CLAUDE.md monetization
// notes) — completion is handled by the /api/webhooks/stripe route, not here.
router.post('/checkout', authenticate, writeLimiter, async (req, res) => {
  try {
    const { venue_id, band_id } = req.body;

    if (!venue_id && !band_id) {
      return res.status(400).json({ message: 'venue_id or band_id is required' });
    }
    if (venue_id && band_id) {
      return res.status(400).json({ message: 'Provide only one of venue_id or band_id' });
    }

    const pool = await getPool();
    const table = venue_id ? 'Venues' : 'Bands';
    const column = venue_id ? 'venue_id' : 'band_id';
    const postId = venue_id || band_id;

    const post = await pool.query(
      `SELECT id, owner_id, name, featured_until FROM ${table} WHERE id = $1 AND is_active = true`,
      [postId]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    if (post.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ message: 'This is not your listing' });
    }
    if (post.rows[0].featured_until && new Date(post.rows[0].featured_until) > new Date()) {
      return res.status(400).json({ message: 'This listing is already featured' });
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch (err) {
      return res.status(503).json({ message: err.message });
    }

    const paymentResult = await pool.query(
      `INSERT INTO Payments (user_id, ${column}, amount, currency, status)
       VALUES ($1, $2, $3, 'usd', 'pending')
       RETURNING id`,
      [req.user.id, postId, FEATURE_LISTING_PRICE_CENTS / 100]
    );
    const paymentId = paymentResult.rows[0].id;

    // Same FRONTEND_URL server.js uses for CORS — keep both in sync.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    // Idempotency key: a client retry (double-click, network blip and re-send) with the
    // same key returns Stripe's original session instead of creating a second one. Scoped
    // to this specific pending payment row, so it can never collide across users/listings.
    const idempotencyKey = req.headers['idempotency-key'] || `checkout-payment-${paymentId}`;

    let session;
    try {
      session = await createStripeSession.fire(
        stripe,
        {
          mode: 'payment',
          payment_method_types: ['card'],
          line_items: [
            process.env.STRIPE_PRICE_ID
              ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
              : {
                  price_data: {
                    currency: 'usd',
                    product_data: { name: `Feature listing: ${post.rows[0].name}` },
                    unit_amount: FEATURE_LISTING_PRICE_CENTS,
                  },
                  quantity: 1,
                },
          ],
          success_url: `${frontendUrl}/dashboard?payment=success`,
          cancel_url: `${frontendUrl}/dashboard?payment=cancelled`,
          metadata: { payment_id: String(paymentId) },
        },
        { idempotencyKey }
      );
    } catch (err) {
      logger.error({ err: err.message }, 'Stripe checkout session creation failed');
      return res.status(503).json({ message: 'Payment provider temporarily unavailable — please try again shortly' });
    }

    await pool.query('UPDATE Payments SET stripe_session_id = $1 WHERE id = $2', [session.id, paymentId]);

    res.status(201).json({ checkout_url: session.url });
  } catch (err) {
    logger.error({ err }, 'Create checkout session error');
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
