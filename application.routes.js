/**
 * Application Routes — Apply, list, status, notes, withdraw
 */
const express = require('express');
const {
  applyToJob, getSeekerApplications, getJobApplications,
  getRecruiterAllApplications, updateApplicationStatus,
  withdrawApplication, updateNotes,
} = require('../controllers/application.controller');
const { protect, requireSeeker, requireRecruiter } = require('../middleware/auth.middleware');
const { uploadResume, handleUpload } = require('../middleware/upload.middleware');

const router = express.Router();

// Seeker routes
router.post('/:jobId', protect, requireSeeker, handleUpload(uploadResume), applyToJob);
router.get('/seeker/mine', protect, requireSeeker, getSeekerApplications);
router.patch('/:id/withdraw', protect, requireSeeker, withdrawApplication);

// Recruiter routes
router.get('/job/:jobId', protect, requireRecruiter, getJobApplications);
router.get('/recruiter/all', protect, requireRecruiter, getRecruiterAllApplications);
router.patch('/:id/status', protect, requireRecruiter, updateApplicationStatus);
router.patch('/:id/notes', protect, requireRecruiter, updateNotes);

module.exports = router;
