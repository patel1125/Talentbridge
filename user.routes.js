/**
 * User Routes — Profile, uploads (resume, photo, logo), resume download, public profile
 */
const express = require('express');
const {
  getProfile, updateProfile, uploadResume, uploadPhoto,
  uploadLogo, downloadResume, getPublicProfile,
} = require('../controllers/user.controller');
const { protect, requireSeeker, requireRecruiter } = require('../middleware/auth.middleware');
const {
  uploadResume: resumeMiddleware,
  uploadPhoto: photoMiddleware,
  uploadLogo: logoMiddleware,
  handleUpload,
} = require('../middleware/upload.middleware');

const router = express.Router();

router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.get('/public/:id', protect, getPublicProfile);

// File uploads
router.post('/upload/resume', protect, requireSeeker, handleUpload(resumeMiddleware), uploadResume);
router.post('/upload/photo', protect, handleUpload(photoMiddleware), uploadPhoto);
router.post('/upload/logo', protect, requireRecruiter, handleUpload(logoMiddleware), uploadLogo);
router.get('/resume/:filename', protect, downloadResume);

module.exports = router;
