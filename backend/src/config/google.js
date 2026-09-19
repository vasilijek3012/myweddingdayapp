const { OAuth2Client } = require('google-auth-library');
const { createBreaker } = require('../utils/circuitBreaker');

let client = null;

function getGoogleClient() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Google Sign-In is not configured — set GOOGLE_CLIENT_ID in backend/.env first');
  }
  if (!client) {
    client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return client;
}

// Network error codes/signals that mean "Google's servers are unreachable" (fetching their
// public certs failed) as opposed to "this specific token is invalid/expired" — only the
// former should count toward tripping the circuit breaker. See utils/circuitBreaker.js.
const NETWORK_ERROR_SIGNALS = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];

const verifyIdTokenBreaker = createBreaker(
  (oauthClient, idToken) => oauthClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID }),
  {
    name: 'google-verify-id-token',
    errorFilter: (err) => !NETWORK_ERROR_SIGNALS.includes(err.code) && !/network|fetch failed/i.test(err.message || ''),
  }
);

// Verifies a Google ID token (the `credential` returned by Google Identity Services
// on the frontend) and returns its payload. Throws if the token is invalid, expired,
// or wasn't issued for this app's GOOGLE_CLIENT_ID.
async function verifyGoogleToken(idToken) {
  const oauthClient = getGoogleClient();
  const ticket = await verifyIdTokenBreaker.fire(oauthClient, idToken);
  return ticket.getPayload();
}

module.exports = { getGoogleClient, verifyGoogleToken };
