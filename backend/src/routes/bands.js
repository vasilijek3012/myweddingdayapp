const express = require('express');
const { getPool } = require('../config/database');
const { authenticate, requireBand } = require('../middleware/auth');
const { cacheGet, cacheSet, cacheInvalidate } = require('../config/redis');
const logger = require('../config/logger');

const router = express.Router();
const LIST_CACHE_TTL = 30;
const DETAIL_CACHE_TTL = 30;

// GET /api/bands?search=&city=&genre=
router.get('/', async (req, res) => {
  try {
    const { search, city, genre } = req.query;

    const cacheKey = `bands:list:${JSON.stringify({ search: search || '', city: city || '', genre: genre || '' })}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const pool = await getPool();

    let query = `
      SELECT b.id, b.name, b.genre, b.description, b.city, b.price_per_event,
             b.phone, b.website, b.image_url, b.created_at,
             b.plan, b.featured_until,
             u.full_name AS owner_name
      FROM Bands b
      JOIN Users u ON b.owner_id = u.id
      WHERE b.is_active = true
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (b.name ILIKE $${params.length} OR b.city ILIKE $${params.length} OR b.description ILIKE $${params.length} OR b.genre ILIKE $${params.length})`;
    }

    if (city) {
      params.push(`%${city}%`);
      query += ` AND b.city ILIKE $${params.length}`;
    }

    if (genre) {
      params.push(`%${genre}%`);
      query += ` AND b.genre ILIKE $${params.length}`;
    }

    query += ' ORDER BY b.featured_until DESC NULLS LAST, b.created_at DESC';

    const result = await pool.query(query, params);
    res.set('X-Cache', 'MISS');
    await cacheSet(cacheKey, result.rows, LIST_CACHE_TTL);
    res.json(result.rows);
  } catch (err) {
    logger.error({ err }, 'Get bands error');
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bands/:id
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `bands:detail:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const pool = await getPool();

    const result = await pool.query(
      `SELECT b.id, b.name, b.genre, b.description, b.city, b.price_per_event,
              b.phone, b.website, b.image_url, b.created_at,
              b.plan, b.featured_until,
              u.full_name AS owner_name, u.email AS owner_email
       FROM Bands b
       JOIN Users u ON b.owner_id = u.id
       WHERE b.id = $1 AND b.is_active = true`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Band not found' });
    }

    res.set('X-Cache', 'MISS');
    await cacheSet(cacheKey, result.rows[0], DETAIL_CACHE_TTL);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, 'Get band error');
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/bands — band role only, one profile per account
router.post('/', authenticate, requireBand, async (req, res) => {
  try {
    const { name, genre, description, city, price_per_event, phone, website, image_url } = req.body;

    if (!name || !city) {
      return res.status(400).json({ message: 'Name and city are required' });
    }

    const pool = await getPool();

    const existing = await pool.query(
      'SELECT id FROM Bands WHERE owner_id = $1 AND is_active = true',
      [req.user.id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'You already have a band profile — edit it instead' });
    }

    const result = await pool.query(
      `INSERT INTO Bands (owner_id, name, genre, description, city, price_per_event, phone, website, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [req.user.id, name, genre || '', description || '', city, price_per_event || null, phone || '', website || '', image_url || '']
    );

    await cacheInvalidate('bands:list:');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, 'Create band error');
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/bands/:id — owner only, own band
router.put('/:id', authenticate, requireBand, async (req, res) => {
  try {
    const pool = await getPool();

    const check = await pool.query(
      'SELECT id FROM Bands WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Band not found or not yours' });
    }

    const { name, genre, description, city, price_per_event, phone, website, image_url } = req.body;

    await pool.query(
      `UPDATE Bands SET
         name=$1, genre=$2, description=$3, city=$4,
         price_per_event=$5, phone=$6, website=$7, image_url=$8
       WHERE id=$9`,
      [name, genre || '', description || '', city, price_per_event || null, phone || '', website || '', image_url || '', req.params.id]
    );

    await cacheInvalidate('bands:list:');
    await cacheInvalidate(`bands:detail:${req.params.id}`);
    res.json({ message: 'Band updated' });
  } catch (err) {
    logger.error({ err }, 'Update band error');
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/bands/:id — owner only, own band
router.delete('/:id', authenticate, requireBand, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.query(
      'UPDATE Bands SET is_active=false WHERE id=$1 AND owner_id=$2',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Band not found or not yours' });
    }

    await cacheInvalidate('bands:list:');
    await cacheInvalidate(`bands:detail:${req.params.id}`);
    res.json({ message: 'Band deleted' });
  } catch (err) {
    logger.error({ err }, 'Delete band error');
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/bands/owner/my — the logged-in band's own profile (or null)
router.get('/owner/my', authenticate, requireBand, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT b.*, u.full_name AS owner_name
       FROM Bands b
       JOIN Users u ON b.owner_id = u.id
       WHERE b.owner_id = $1 AND b.is_active = true`,
      [req.user.id]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    logger.error({ err }, 'Get my band error');
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
