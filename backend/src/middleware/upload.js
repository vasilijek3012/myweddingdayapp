const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// On Railway, the filesystem is ephemeral unless a Volume is attached — set UPLOAD_DIR to
// that Volume's mount path (e.g. /data/uploads) in the service's env vars so uploaded photos
// survive redeploys. Locally this defaults to backend/uploads (gitignored).
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, '..', '..', 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP or GIF images are allowed'));
    }
    cb(null, true);
  },
});

module.exports = { upload, UPLOAD_DIR };
