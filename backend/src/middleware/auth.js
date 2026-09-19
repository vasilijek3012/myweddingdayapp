const jwt = require('jsonwebtoken');
const { cacheGet } = require('../config/redis');

async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  // No-ops (returns null) if Redis isn't configured, so logout just doesn't revoke anything
  // rather than blocking every request — see auth.js's /logout route.
  if (user.jti && await cacheGet(`revoked:jwt:${user.jti}`)) {
    return res.status(401).json({ message: 'Token has been revoked' });
  }

  req.user = user;
  next();
}

function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ message: 'Only venue owners can perform this action' });
  }
  next();
}

function requireBand(req, res, next) {
  if (req.user?.role !== 'band') {
    return res.status(403).json({ message: 'Only registered bands can perform this action' });
  }
  next();
}

module.exports = { authenticate, requireOwner, requireBand };
