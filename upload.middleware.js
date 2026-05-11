/**
 * Upload Middleware — Multer configuration for resumes, profile photos, company logos
 * Stores files on disk under uploads/{resumes|photos|logos}
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/** Creates directory recursively if it doesn't exist */
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const UPLOAD_BASE = path.join(__dirname, '../../uploads');
ensureDir(path.join(UPLOAD_BASE, 'resumes'));
ensureDir(path.join(UPLOAD_BASE, 'photos'));
ensureDir(path.join(UPLOAD_BASE, 'logos'));

// ── Storage Engines ──
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_BASE, 'resumes')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `resume_${req.user._id}_${Date.now()}${ext}`);
  },
});

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_BASE, 'photos')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `photo_${req.user._id}_${Date.now()}${ext}`);
  },
});

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(UPLOAD_BASE, 'logos')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${req.user._id}_${Date.now()}${ext}`);
  },
});

/** Accepts only PDF, DOC, DOCX for resumes */
const resumeFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed for resumes.'), false);
  }
};

/** Accepts only JPG, PNG, WEBP for images */
const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed.'), false);
  }
};

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFilter,
  limits: { fileSize: MAX_SIZE },
}).single('resume');

const uploadPhoto = multer({
  storage: photoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB for photos
}).single('photo');

const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single('logo');

/**
 * Wraps Multer to catch errors and return JSON instead of HTML.
 * Handles LIMIT_FILE_SIZE and fileFilter errors.
 */
const handleUpload = (uploadFn) => (req, res, next) => {
  uploadFn(req, res, (err) => {
    if (!err) return next();
    // LIMIT_ codes come from multer itself
    if (err.code && err.code.startsWith('LIMIT_')) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large. Maximum size is 5MB.'
        : `Upload error: ${err.code}`;
      return res.status(400).json({ success: false, message: msg });
    }
    // fileFilter errors and anything else
    return res.status(400).json({ success: false, message: err.message || 'File upload failed.' });
  });
};

module.exports = { uploadResume, uploadPhoto, uploadLogo, handleUpload };