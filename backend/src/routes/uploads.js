const express = require('express');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

const router = express.Router();

// POST /api/uploads — any logged-in vendor (owner or band) uploads one photo and gets back
// an absolute URL to save into their venue/band's existing `image_url` field via the normal
// PUT /api/venues/:id or PUT /api/bands/:id calls.
router.post('/', authenticate, (req, res) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'No photo file provided' });
    }

    const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(201).json({ url });
  });
});

module.exports = router;
