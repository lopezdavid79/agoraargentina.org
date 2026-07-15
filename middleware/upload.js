const multer = require('multer');
const path = require('path');
const fs = require('fs');

const MEGABYTE = 1024 * 1024;
const ALLOWED_MIMES = ['image/jpeg', 'image/png'];
const MAX_SIZE = 5 * MEGABYTE;

/**
 * Determine storage subdirectory based on the request URL.
 * @param {import('express').Request} req
 * @returns {'noticias' | 'cursos'}
 */
function determineSubdir(req) {
  return req.originalUrl.includes('noticias') ? 'noticias' : 'cursos';
}

/**
 * Sanitize a filename: lowercase, remove accents, replace non-alphanumeric chars.
 * @param {string} originalname
 * @returns {string}
 */
function sanitizeFilename(originalname) {
  return originalname
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]/g, '-');
}

/**
 * Multer destination callback — determines the directory based on req.originalUrl.
 * Exported separately for unit testing.
 */
function destination(req, file, cb) {
  const subdir = determineSubdir(req);
  const dir = path.join(__dirname, '..', 'public', 'images', subdir);
  // Ensure the directory exists (safe for first use)
  fs.mkdirSync(dir, { recursive: true });
  cb(null, dir);
}

/**
 * Multer filename callback — sanitizes and timestamps the filename.
 * Exported separately for unit testing.
 */
function generateFilename(req, file, cb) {
  const ts = Date.now();
  const safeName = sanitizeFilename(file.originalname);
  cb(null, `${ts}-${safeName}`);
}

const storage = multer.diskStorage({
  destination,
  filename: generateFilename
});

const fileFilter = (req, file, cb) => {
  const isValid = ALLOWED_MIMES.includes(file.mimetype);
  cb(isValid ? null : new Error('Tipo no permitido'), isValid);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE }
});

// Default export: the configured multer instance for use in routers
module.exports = upload;
// Named exports for unit testing
module.exports.fileFilter = fileFilter;
module.exports.destination = destination;
module.exports.generateFilename = generateFilename;
module.exports.storage = storage;
module.exports.determineSubdir = determineSubdir;
module.exports.sanitizeFilename = sanitizeFilename;
module.exports.ALLOWED_MIMES = ALLOWED_MIMES;
module.exports.MAX_SIZE = MAX_SIZE;
