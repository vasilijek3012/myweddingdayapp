const express = require('express');
const { getPool } = require('../config/database');
const { authenticate, requireOwner } = require('../middleware/auth');
const { cacheGet, cacheSet, cacheInvalidate } = require('../config/redis');
const logger = require('../config/logger');

const router = express.Router();
const LIST_CACHE_TTL = 30; // seconds — short enough that a missed invalidation self-heals fast
const DETAIL_CACHE_TTL = 30;

// GET /api/venues?type=wedding&search=...
router.get('/', async (req, res) => {
  try {
    const { type, search, city } = req.query;

    const cacheKey = `venues:list:${JSON.stringify({ type: type || '', search: search || '', city: city || '' })}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const pool = await getPool();

    let query = `
      SELECT v.id, v.name, v.type, v.description, v.address, v.city,
             v.latitude, v.longitude, v.capacity, v.base_price,
             v.phone, v.website, v.image_url, v.created_at,
             v.plan, v.featured_until,
             u.full_name AS owner_name
      FROM Venues v
      JOIN Users u ON v.owner_id = u.id
      WHERE v.is_active = true
    `;
    const params = [];

    if (type) {
      params.push(type);
      query += ` AND v.type = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (v.name ILIKE $${params.length} OR v.city ILIKE $${params.length} OR v.description ILIKE $${params.length})`;
    }

    if (city) {
      params.push(`%${city}%`);
      query += ` AND v.city ILIKE $${params.length}`;
    }

    query += ' ORDER BY v.featured_until DESC NULLS LAST, v.created_at DESC';

    const result = await pool.query(query, params);
    res.set('X-Cache', 'MISS');
    await cacheSet(cacheKey, result.rows, LIST_CACHE_TTL);
    res.json(result.rows);
  } catch (err) {
    logger.error({ err }, 'Get venues error');
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/venues/:id
router.get('/:id', async (req, res) => {
  try {
    const cacheKey = `venues:detail:${req.params.id}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const pool = await getPool();

    const venueResult = await pool.query(
      `SELECT v.id, v.name, v.type, v.description, v.address, v.city,
              v.latitude, v.longitude, v.capacity, v.base_price,
              v.phone, v.website, v.image_url, v.created_at,
              v.plan, v.featured_until,
              u.full_name AS owner_name, u.email AS owner_email
       FROM Venues v
       JOIN Users u ON v.owner_id = u.id
       WHERE v.id = $1 AND v.is_active = true`,
      [req.params.id]
    );

    if (venueResult.rows.length === 0) {
      return res.status(404).json({ message: 'Venue not found' });
    }

    const mealPlansResult = await pool.query(
      `SELECT id, name, description, price_per_person, includes_drinks
       FROM MealPlans
       WHERE venue_id = $1
       ORDER BY price_per_person ASC`,
      [req.params.id]
    );

    const payload = { ...venueResult.rows[0], meal_plans: mealPlansResult.rows };
    res.set('X-Cache', 'MISS');
    await cacheSet(cacheKey, payload, DETAIL_CACHE_TTL);
    res.json(payload);
  } catch (err) {
    logger.error({ err }, 'Get venue error');
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/venues — owner only
router.post('/', authenticate, requireOwner, async (req, res) => {
  try {
    const { name, type, description, address, city, latitude, longitude,
            capacity, base_price, phone, website, image_url } = req.body;

    if (!name || !type || !address || !city) {
      return res.status(400).json({ message: 'Name, type, address and city are required' });
    }

    if (!['wedding', 'prewedding'].includes(type)) {
      return res.status(400).json({ message: 'Type must be wedding or prewedding' });
    }

    const pool = await getPool();
    const result = await pool.query(
      `INSERT INTO Venues (owner_id, name, type, description, address, city, latitude, longitude, capacity, base_price, phone, website, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [req.user.id, name, type, description || '', address, city, latitude || null, longitude || null,
       capacity || null, base_price || null, phone || '', website || '', image_url || '']
    );

    await cacheInvalidate('venues:list:');
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, 'Create venue error');
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/venues/:id — owner only, own venues
router.put('/:id', authenticate, requireOwner, async (req, res) => {
  try {
    const pool = await getPool();

    const check = await pool.query(
      'SELECT id FROM Venues WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Venue not found or not yours' });
    }

    const { name, type, description, address, city, latitude, longitude,
            capacity, base_price, phone, website, image_url } = req.body;

    await pool.query(
      `UPDATE Venues SET
         name=$1, type=$2, description=$3, address=$4,
         city=$5, latitude=$6, longitude=$7,
         capacity=$8, base_price=$9, phone=$10,
         website=$11, image_url=$12
       WHERE id=$13`,
      [name, type, description || '', address, city, latitude || null, longitude || null,
       capacity || null, base_price || null, phone || '', website || '', image_url || '', req.params.id]
    );

    await cacheInvalidate('venues:list:');
    await cacheInvalidate(`venues:detail:${req.params.id}`);
    res.json({ message: 'Venue updated' });
  } catch (err) {
    logger.error({ err }, 'Update venue error');
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/venues/:id — owner only
router.delete('/:id', authenticate, requireOwner, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.query(
      'UPDATE Venues SET is_active=false WHERE id=$1 AND owner_id=$2',
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Venue not found or not yours' });
    }

    await cacheInvalidate('venues:list:');
    await cacheInvalidate(`venues:detail:${req.params.id}`);
    res.json({ message: 'Venue deleted' });
  } catch (err) {
    logger.error({ err }, 'Delete venue error');
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/venues/:id/meal-plans — owner only
router.post('/:id/meal-plans', authenticate, requireOwner, async (req, res) => {
  try {
    const pool = await getPool();

    const check = await pool.query(
      'SELECT id FROM Venues WHERE id = $1 AND owner_id = $2 AND is_active = true',
      [req.params.id, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Venue not found or not yours' });
    }

    const { name, description, price_per_person, includes_drinks } = req.body;

    if (!name || !price_per_person) {
      return res.status(400).json({ message: 'Name and price per person are required' });
    }

    const result = await pool.query(
      `INSERT INTO MealPlans (venue_id, name, description, price_per_person, includes_drinks)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.params.id, name, description || '', price_per_person, !!includes_drinks]
    );

    await cacheInvalidate(`venues:detail:${req.params.id}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error({ err }, 'Create meal plan error');
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/venues/owner/my — get owner's own venues
router.get('/owner/my', authenticate, requireOwner, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query(
      `SELECT v.*, u.full_name AS owner_name
       FROM Venues v
       JOIN Users u ON v.owner_id = u.id
       WHERE v.owner_id = $1 AND v.is_active = true
       ORDER BY v.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    logger.error({ err }, 'Get my venues error');
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
