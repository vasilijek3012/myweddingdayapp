const express = require('express');
const { getPool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { writeLimiter } = require('../middleware/rateLimit');
const { cacheGet, cacheSet, cacheInvalidate } = require('../config/redis');
const logger = require('../config/logger');

const router = express.Router();
const LIST_CACHE_TTL = 30;

function parsePostRef(query) {
  const venue_id = query.venue_id ? Number(query.venue_id) : null;
  const band_id = query.band_id ? Number(query.band_id) : null;
  return { venue_id, band_id };
}

// GET /api/reviews?venue_id=X or ?band_id=Y — public
router.get('/', async (req, res) => {
  try {
    const { venue_id, band_id } = parsePostRef(req.query);

    if (!venue_id && !band_id) {
      return res.status(400).json({ message: 'venue_id or band_id is required' });
    }

    const column = venue_id ? 'venue_id' : 'band_id';
    const postId = venue_id || band_id;
    const cacheKey = `reviews:${column}:${postId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const pool = await getPool();

    const reviews = await pool.query(
      `SELECT r.id, r.user_id, r.rating, r.comment, r.created_at, r.updated_at, u.full_name AS user_name
       FROM Reviews r
       JOIN Users u ON r.user_id = u.id
       WHERE r.${column} = $1
       ORDER BY r.created_at DESC`,
      [postId]
    );

    const summary = await pool.query(
      `SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::float AS average
       FROM Reviews WHERE ${column} = $1`,
      [postId]
    );

    const payload = {
      reviews: reviews.rows,
      count: summary.rows[0].count,
      average: summary.rows[0].average,
    };
    res.set('X-Cache', 'MISS');
    await cacheSet(cacheKey, payload, LIST_CACHE_TTL);
    res.json(payload);
  } catch (err) {
    logger.error({ err }, 'Get reviews error');
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/reviews/mine?venue_id=X or ?band_id=Y — the logged-in user's own review for this post
router.get('/mine', authenticate, async (req, res) => {
  try {
    const { venue_id, band_id } = parsePostRef(req.query);

    if (!venue_id && !band_id) {
      return res.status(400).json({ message: 'venue_id or band_id is required' });
    }

    const pool = await getPool();
    const column = venue_id ? 'venue_id' : 'band_id';
    const postId = venue_id || band_id;

    const result = await pool.query(
      `SELECT id, rating, comment, created_at, updated_at
       FROM Reviews WHERE user_id = $1 AND ${column} = $2`,
      [req.user.id, postId]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    logger.error({ err }, 'Get my review error');
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reviews — authenticated, any role. Creates the user's review for a post, or
// updates it if they already left one (one review per user per venue/band).
router.post('/', authenticate, writeLimiter, async (req, res) => {
  try {
    const { venue_id, band_id, rating, comment } = req.body;

    if (!venue_id && !band_id) {
      return res.status(400).json({ message: 'venue_id or band_id is required' });
    }
    if (venue_id && band_id) {
      return res.status(400).json({ message: 'Provide only one of venue_id or band_id' });
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be an integer from 1 to 5' });
    }

    const pool = await getPool();
    const column = venue_id ? 'venue_id' : 'band_id';
    const table = venue_id ? 'Venues' : 'Bands';
    const postId = venue_id || band_id;

    const post = await pool.query(
      `SELECT id, owner_id FROM ${table} WHERE id = $1 AND is_active = true`,
      [postId]
    );

    if (post.rows.length === 0) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    if (post.rows[0].owner_id === req.user.id) {
      return res.status(403).json({ message: 'You cannot review your own listing' });
    }

    const existing = await pool.query(
      `SELECT id FROM Reviews WHERE user_id = $1 AND ${column} = $2`,
      [req.user.id, postId]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE Reviews SET rating = $1, comment = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, rating, comment, created_at, updated_at`,
        [rating, comment || '', existing.rows[0].id]
      );
      await cacheInvalidate(`reviews:${column}:${postId}`);
      return res.json(result.rows[0]);
    }

    result = await pool.query(
      `INSERT INTO Reviews (user_id, ${column}, rating, comment)
       VALUES ($1, $2, $3, $4)
       RETURNING id, rating, comment, created_at, updated_at`,
      [req.user.id, postId, rating, comment || '']
    );
    await cacheInvalidate(`reviews:${column}:${postId}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, 'Create/update review error');
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/reviews/:id — only the review's own author
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      'DELETE FROM Reviews WHERE id = $1 AND user_id = $2 RETURNING venue_id, band_id',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Review not found or not yours' });
    }

    const { venue_id, band_id } = result.rows[0];
    await cacheInvalidate(venue_id ? `reviews:venue_id:${venue_id}` : `reviews:band_id:${band_id}`);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    logger.error({ err }, 'Delete review error');
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
