/**
 * Job Controller — CRUD for jobs, public browse, category counts
 */
const { validationResult } = require('express-validator');
const Job = require('../models/Job.model');
const Application = require('../models/Application.model');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.utils');

/** Extracts company info from recruiter for denormalized display on job listings */
const buildCompanySnapshot = (recruiter) => ({
  name: recruiter.recruiterProfile?.companyName || '',
  logo: recruiter.recruiterProfile?.companyLogo || null,
  industry: recruiter.recruiterProfile?.industry || '',
  size: recruiter.recruiterProfile?.companySize || '',
  website: recruiter.recruiterProfile?.companyWebsite || '',
});

/** Creates job. Sets recruiter and companySnapshot. Recruiter only. */
const createJob = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const job = await Job.create({
      ...req.body,
      recruiter: req.user._id,
      companySnapshot: buildCompanySnapshot(req.user),
    });

    return sendSuccess(res, { job }, 'Job created successfully.', 201);
  } catch (err) {
    console.error('Create job error:', err);
    return sendError(res, 'Failed to create job.', 500);
  }
};

/** Returns { category: count } for all active jobs. Used by homepage category grid. */
const getCategoryCounts = async (req, res) => {
  try {
    const counts = await Job.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const byCategory = Object.fromEntries(counts.map((c) => [c._id, c.count]));
    return sendSuccess(res, { counts: byCategory });
  } catch (err) {
    return sendError(res, 'Failed to fetch category counts.', 500);
  }
};

/** Paginated job list. Filters: search (text), jobType, location, category, experienceLevel, salary, remote. */
const getPublicJobs = async (req, res) => {
  try {
    const {
      page = 1, limit = 12,
      search, jobType, location, remote,
      category, experienceLevel,
      salaryMin, salaryMax,
      sort = '-createdAt',
    } = req.query;

    const filter = { status: 'active' };

    if (search) {
      filter.$text = { $search: search };
    }
    if (jobType) filter.jobType = jobType;
    if (remote === 'true') filter['location.remote'] = true;
    if (location) {
      const locLower = String(location).toLowerCase().trim();
      if (locLower === 'remote') {
        filter['location.remote'] = true;
      } else {
        const locRegex = new RegExp(locLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [
          { 'location.city': locRegex },
          { 'location.state': locRegex },
          { 'location.country': locRegex },
        ];
      }
    }
    if (category) filter.category = category;
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (salaryMin) filter['salary.min'] = { $gte: Number(salaryMin) };
    if (salaryMax) filter['salary.max'] = { $lte: Number(salaryMax) };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Job.countDocuments(filter);

    const jobs = await Job.find(filter)
      .select('-recruiter')  // Don't expose recruiter ID to public
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    return sendPaginated(res, jobs, {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return sendError(res, 'Failed to fetch jobs.', 500);
  }
};

/** Returns single job (excludes draft). Increments viewCount. */
const getJobById = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, status: { $ne: 'draft' } });
    if (!job) return sendError(res, 'Job not found.', 404);

    // Increment view count
    job.viewCount += 1;
    await job.save();

    return sendSuccess(res, { job });
  } catch (err) {
    return sendError(res, 'Failed to fetch job.', 500);
  }
};

/** Recruiter's jobs, paginated. Optional status filter. */
const getMyJobs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = { recruiter: req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter).sort('-createdAt').skip(skip).limit(Number(limit));

    return sendPaginated(res, jobs, { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    return sendError(res, 'Failed to fetch your jobs.', 500);
  }
};

/** Full job update. Refreshes companySnapshot. Recruiter must own job. */
const updateJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, recruiter: req.user._id });
    if (!job) return sendError(res, 'Job not found or you do not have permission to edit it.', 404);

    // Update company snapshot in case profile changed
    req.body.companySnapshot = buildCompanySnapshot(req.user);

    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return sendSuccess(res, { job: updated }, 'Job updated successfully.');
  } catch (err) {
    return sendError(res, 'Failed to update job.', 500);
  }
};

/** Changes job status (draft|active|paused|closed) only. */
const updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'active', 'paused', 'closed'].includes(status)) {
      return sendError(res, 'Invalid status value.', 400);
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, recruiter: req.user._id },
      { status },
      { new: true }
    );
    if (!job) return sendError(res, 'Job not found.', 404);

    return sendSuccess(res, { job }, `Job status updated to "${status}".`);
  } catch (err) {
    return sendError(res, 'Failed to update status.', 500);
  }
};

/** Deletes job and all related applications. Recruiter must own job. */
const deleteJob = async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, recruiter: req.user._id });
    if (!job) return sendError(res, 'Job not found or permission denied.', 404);

    // Also remove related applications
    await Application.deleteMany({ job: req.params.id });

    return sendSuccess(res, {}, 'Job and all related applications deleted.');
  } catch (err) {
    return sendError(res, 'Failed to delete job.', 500);
  }
};

module.exports = {
  createJob, getPublicJobs, getJobById, getMyJobs, getCategoryCounts,
  updateJob, updateJobStatus, deleteJob,
};
