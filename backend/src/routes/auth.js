const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { getPool } = require('../config/database');
const { getGoogleClient, verifyGoogleToken } = require('../config/google');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { cacheSet } = require('../config/redis');
const logger = require('../config/logger');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    // jti (JWT ID) — a unique per-token identifier, not part of the auth data itself, that
    // exists purely so logout can blacklist *this one token* in Redis without needing to
    // track every issued token up front. See POST /logout and middleware/auth.js.
    { id: user.id, email: user.email, role: user.role, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const { password, role } = req.body;
    const full_name = (req.body.full_name || '').trim();

    if (!email || !password || !full_name) {
      return res.status(400).json({ message: 'Email, password and full name are required' });
    }
    // The frontend already enforces these (register.component.ts's Validators), but that's
    // trivially bypassed by anyone calling the API directly — the real check has to live here.
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userRole = ['owner', 'band'].includes(role) ? role : 'visitor';
    const pool = await getPool();

    const existing = await pool.query('SELECT id FROM Users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO Users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role`,
      [email, password_hash, full_name, userRole]
    );

    const user = result.rows[0];
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (err) {
    logger.error({ err }, 'Register error');
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const pool = await getPool();
    const result = await pool.query(
      'SELECT id, email, password_hash, full_name, role FROM Users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);

    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
  } catch (err) {
    logger.error({ err }, 'Login error');
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/google', authLimiter, async (req, res) => {
  try {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    try {
      getGoogleClient();
    } catch (err) {
      return res.status(503).json({ message: err.message });
    }

    let payload;
    try {
      payload = await verifyGoogleToken(credential);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid Google credential' });
    }

    if (!payload.email_verified) {
      return res.status(401).json({ message: 'Google email is not verified' });
    }

    // Normalize the same way register/login do, so this always matches an existing
    // password-based account with the same email regardless of case.
    const email = payload.email.trim().toLowerCase();

    const pool = await getPool();

    // Already signed in with Google before — log straight in.
    let result = await pool.query(
      'SELECT id, email, full_name, role FROM Users WHERE google_id = $1',
      [payload.sub]
    );

    if (result.rows.length === 0) {
      // Same email registered with a password before — link this Google account to it.
      const byEmail = await pool.query('SELECT id, email, full_name, role FROM Users WHERE email = $1', [email]);

      if (byEmail.rows.length > 0) {
        result = await pool.query(
          `UPDATE Users SET google_id = $1 WHERE id = $2
           RETURNING id, email, full_name, role`,
          [payload.sub, byEmail.rows[0].id]
        );
      } else {
        // Brand new account.
        const userRole = ['owner', 'band'].includes(role) ? role : 'visitor';
        result = await pool.query(
          `INSERT INTO Users (email, full_name, role, google_id)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, full_name, role`,
          [email, payload.name || email, userRole, payload.sub]
        );
      }
    }

    const user = result.rows[0];
    const token = signToken(user);

    res.json({ token, user });
  } catch (err) {
    logger.error({ err }, 'Google sign-in error');
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/logout — blacklists the current token's jti in Redis until its natural
// expiry, so it can't be reused even though JWTs are otherwise stateless/unrevokable by
// design. A no-op (still returns success) if Redis isn't configured — logout then relies on
// the client just discarding the token client-side, same as before this existed.
router.post('/logout', authenticate, async (req, res) => {
  const ttl = req.user.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) {
    await cacheSet(`revoked:jwt:${req.user.jti}`, true, ttl);
  }
  res.json({ message: 'Logged out' });
});

module.exports = router;
