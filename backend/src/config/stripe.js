// Prep only — not wired into any route yet. See CLAUDE.md "Monetization" section
// for the intended pay-to-publish flow and the decisions still open before this goes live.
let stripeClient = null;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured — set STRIPE_SECRET_KEY in backend/.env first');
  }
  if (!stripeClient) {
    stripeClient = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

module.exports = { getStripe };
