/**
 * Application Controller — Apply, list, status updates, notes, withdraw
 */
const Application = require('../models/Application.model');
const Job = require('../models/Job.model');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.utils');

/** Seeker applies to job. Captures applicant snapshot. Uses uploaded resume or profile resume. One per job per user. */
const applyToJob = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.jobId, status: 'active' });
    if (!job) return sendError(res, 'Job not found or no longer accepting applications.', 404);

    // Prevent applying to own listing (edge case)
    if (job.recruiter.toString() === req.user._id.toString()) {
      return sendError(res, 'You cannot apply to your own job listing.', 400);
    }

    // Check already applied
    const existing = await Application.findOne({ job: job._id, seeker: req.user._id });
    if (existing) return sendError(res, 'You have already applied to this job.', 409);

    // Build seeker snapshot
    const sp = req.user.seekerProfile || {};
    const applicantSnapshot = {
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      phone: req.user.phone || '',
      headline: sp.headline || '',
      skills: sp.skills || [],
      location: sp.location || '',
      linkedinUrl: sp.linkedinUrl || '',
      portfolioUrl: sp.portfolioUrl || '',
    };

    // Build resume file info from either uploaded file or existing profile resume
    let resumeFile = null;
    if (req.file) {
      resumeFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };
    } else if (sp.resumeFile?.filename) {
      resumeFile = sp.resumeFile;
    }

    const application = await Application.create({
      job: job._id,
      seeker: req.user._id,
      recruiter: job.recruiter,
      coverLetter: req.body.coverLetter || '',
      resumeFile,
      applicantSnapshot,
      statusHistory: [{ status: 'applied', changedBy: req.user._id }],
    });

    // Increment application count on job
    await Job.findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });

    return sendSuccess(res, { application }, 'Application submitted successfully.', 201);
  } catch (err) {
    if (err.code === 11000) return sendError(res, 'You have already applied to this job.', 409);
    console.error('Apply error:', err);
    return sendError(res, 'Failed to submit application.', 500);
  }
};

/** Seeker's applications with populated job. Paginated, optional status filter. */
const getSeekerApplications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { seeker: req.user._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Application.countDocuments(filter);

    const applications = await Application.find(filter)
      .populate('job', 'title companySnapshot location salary jobType status')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit));

    return sendPaginated(res, applications, {
      page: Number(page), limit: Number(limit), total,
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return sendError(res, 'Failed to fetch applications.', 500);
  }
};

/** Applicants for one job. Recruiter must own job. Marks recruiterViewed. */
const getJobApplications = async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.jobId, recruiter: req.user._id });
    if (!job) return sendError(res, 'Job not found or access denied.', 404);

    const { page = 1, limit = 20, status } = req.query;
    const filter = { job: job._id };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Application.countDocuments(filter);

    const applications = await Application.find(filter)
      .populate('seeker', 'firstName lastName email phone profilePhoto seekerProfile')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit));

    // Mark as viewed
    await Application.updateMany({ job: job._id, recruiterViewed: false }, { recruiterViewed: true });

    return sendPaginated(res, applications, {
      page: Number(page), limit: Number(limit), total,
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return sendError(res, 'Failed to fetch applicants.', 500);
  }
};

/** All applications across recruiter's jobs. Filter by status, jobId. */
const getRecruiterAllApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, jobId } = req.query;
    const filter = { recruiter: req.user._id };
    if (status) filter.status = status;
    if (jobId) filter.job = jobId;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Application.countDocuments(filter);

    const applications = await Application.find(filter)
      .populate('job', 'title companySnapshot')
      .populate('seeker', 'firstName lastName email phone profilePhoto seekerProfile')
      .sort('-createdAt')
      .skip(skip)
      .limit(Number(limit));

    return sendPaginated(res, applications, {
      page: Number(page), limit: Number(limit), total,
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return sendError(res, 'Failed to fetch applications.', 500);
  }
};

/** Updates application status. Appends to statusHistory. Recruiter must own. */
const updateApplicationStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['applied', 'under-review', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'];
    if (!validStatuses.includes(status)) return sendError(res, 'Invalid status.', 400);

    const application = await Application.findOne({ _id: req.params.id, recruiter: req.user._id });
    if (!application) return sendError(res, 'Application not found or access denied.', 404);

    application.status = status;
    application.statusHistory.push({ status, note: note || '', changedBy: req.user._id });
    await application.save();

    return sendSuccess(res, { application }, `Application status updated to "${status}".`);
  } catch (err) {
    return sendError(res, 'Failed to update status.', 500);
  }
};

/** Seeker withdraws. Cannot withdraw hired/rejected. Decrements job applicationCount. */
const withdrawApplication = async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, seeker: req.user._id });
    if (!application) return sendError(res, 'Application not found.', 404);
    if (['hired', 'rejected'].includes(application.status)) {
      return sendError(res, 'Cannot withdraw a finalised application.', 400);
    }

    application.status = 'withdrawn';
    application.statusHistory.push({ status: 'withdrawn', changedBy: req.user._id });
    await application.save();

    // Decrement counter
    await Job.findByIdAndUpdate(application.job, { $inc: { applicationCount: -1 } });

    return sendSuccess(res, {}, 'Application withdrawn.');
  } catch (err) {
    return sendError(res, 'Failed to withdraw application.', 500);
  }
};

/** Sets recruiterNotes and rating (1–5) on application. Private to recruiter. */
const updateNotes = async (req, res) => {
  try {
    const { recruiterNotes, rating } = req.body;
    const application = await Application.findOneAndUpdate(
      { _id: req.params.id, recruiter: req.user._id },
      { recruiterNotes, rating },
      { new: true }
    );
    if (!application) return sendError(res, 'Application not found.', 404);
    return sendSuccess(res, { application }, 'Notes updated.');
  } catch (err) {
    return sendError(res, 'Failed to update notes.', 500);
  }
};

module.exports = {
  applyToJob, getSeekerApplications, getJobApplications,
  getRecruiterAllApplications, updateApplicationStatus,
  withdrawApplication, updateNotes,
};
