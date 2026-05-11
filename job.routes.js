/**
 * Job Routes — Public browse, category counts, CRUD for recruiters
 */
const express = require('express');
const { body } = require('express-validator');
const {
  createJob, getPublicJobs, getJobById, getMyJobs, getCategoryCounts,
  updateJob, updateJobStatus, deleteJob,
} = require('../controllers/job.controller');
const { protect, requireRecruiter } = require('../middleware/auth.middleware');

const router = express.Router();

const jobValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('responsibilities').isArray({ min: 1 }).withMessage('At least one responsibility required'),
  body('qualifications').isArray({ min: 1 }).withMessage('At least one qualification required'),
  body('jobType').isIn(['full-time', 'part-time', 'contract', 'internship', 'freelance']),
  body('experienceLevel').isIn(['entry', 'mid', 'senior', 'lead', 'executive']),
  body('category').trim().notEmpty().withMessage('Category is required'),
];

// Public routes (order matters: specific paths before /:id)
router.get('/category-counts', getCategoryCounts);
router.get('/', getPublicJobs);
router.get('/:id', getJobById);

// Recruiter-only
router.post('/', protect, requireRecruiter, jobValidation, createJob);
router.get('/recruiter/mine', protect, requireRecruiter, getMyJobs);
router.put('/:id', protect, requireRecruiter, updateJob);
router.patch('/:id/status', protect, requireRecruiter, updateJobStatus);
router.delete('/:id', protect, requireRecruiter, deleteJob);

module.exports = router;
