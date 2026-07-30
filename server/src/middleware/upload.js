const multer = require('multer');
const env = require('../config/env');
const { ApiError } = require('../utils/errors');

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024, files: 10 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new ApiError(400, `File type not allowed: ${file.mimetype}`));
    }
    return cb(null, true);
  },
});

module.exports = { upload, ALLOWED_MIME };
