/**
 * User Controller — Profile CRUD, resume/photo/logo uploads, resume download
 */
const path = require('path');
const fs = require('fs');
const User = require('../models/User.model');
const { sendSuccess, sendError } = require('../utils/response.utils');

/** Returns current user's full profile (safe object, no password) */
const getProfile = async (req, res) => {
  try {
    return sendSuccess(res, { user: req.user.toSafeObject() });
  } catch (err) {
    return sendError(res, 'Failed to fetch profile.', 500);
  }
};

/** Updates profile fields. Role-specific: seekerProfile or recruiterProfile. */
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const updates = {};
    if (firstName) updates.firstName = firstName;
    if (lastName) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;

    if (req.user.role === 'seeker') {
      const fields = ['headline', 'bio', 'location', 'skills', 'experience', 'education',
        'linkedinUrl', 'portfolioUrl', 'githubUrl', 'expectedSalary', 'jobTypes', 'availability'];
      fields.forEach(f => {
        if (req.body[f] !== undefined) updates[`seekerProfile.${f}`] = req.body[f];
      });
    }

    if (req.user.role === 'recruiter') {
      const fields = ['companyName', 'companyWebsite', 'companyDescription', 'industry',
        'companySize', 'foundedYear', 'headquarters', 'linkedinUrl', 'twitterUrl', 'jobTitle'];
      fields.forEach(f => {
        if (req.body[f] !== undefined) updates[`recruiterProfile.${f}`] = req.body[f];
      });
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    return sendSuccess(res, { user: user.toSafeObject() }, 'Profile updated.');
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to update profile.', 500);
  }
};

/** Replaces seeker's resume. Deletes old file from disk. Only for seekers. */
const uploadResume = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded.', 400);

    // Delete old resume if exists
    const user = await User.findById(req.user._id);
    const oldFilename = user.seekerProfile?.resumeFile?.filename;
    if (oldFilename) {
      const oldPath = path.join(__dirname, '../../uploads/resumes', oldFilename);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const resumeData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
    };

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { 'seekerProfile.resumeFile': resumeData } },
      { new: true }
    );

    return sendSuccess(res, {
      resume: updated.seekerProfile.resumeFile,
      url: `/uploads/resumes/${req.file.filename}`,
    }, 'Resume uploaded successfully.');
  } catch (err) {
    return sendError(res, 'Failed to upload resume.', 500);
  }
};

/** Replaces profile photo. Deletes old file. Available to both roles. */
const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded.', 400);

    // Delete old photo
    const user = await User.findById(req.user._id);
    if (user.profilePhoto) {
      const oldPath = path.join(__dirname, '../../uploads/photos', path.basename(user.profilePhoto));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const photoUrl = `/uploads/photos/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, { profilePhoto: photoUrl });

    return sendSuccess(res, { photoUrl }, 'Photo uploaded successfully.');
  } catch (err) {
    return sendError(res, 'Failed to upload photo.', 500);
  }
};

/** Sets recruiter's company logo. Only for recruiters. */
const uploadLogo = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 'No file uploaded.', 400);

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user._id, {
      $set: { 'recruiterProfile.companyLogo': logoUrl },
    });

    return sendSuccess(res, { logoUrl }, 'Company logo uploaded.');
  } catch (err) {
    return sendError(res, 'Failed to upload logo.', 500);
  }
};

/** Serves resume file. Only owner or recruiter can download. */
const downloadResume = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../uploads/resumes', filename);

    if (!fs.existsSync(filePath)) {
      return sendError(res, 'Resume file not found.', 404);
    }

    // Security: ensure only owner can download (simplified check)
    const owner = await User.findOne({ 'seekerProfile.resumeFile.filename': filename });
    if (owner && owner._id.toString() !== req.user._id.toString() && req.user.role !== 'recruiter') {
      return sendError(res, 'Access denied.', 403);
    }

    res.download(filePath);
  } catch (err) {
    return sendError(res, 'Failed to download resume.', 500);
  }
};

/** Returns user profile for viewing (e.g. recruiter viewing applicant). Excludes password and resume file. */
const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -seekerProfile.resumeFile');
    if (!user) return sendError(res, 'User not found.', 404);
    return sendSuccess(res, { user });
  } catch (err) {
    return sendError(res, 'Failed to fetch profile.', 500);
  }
};

module.exports = { getProfile, updateProfile, uploadResume, uploadPhoto, uploadLogo, downloadResume, getPublicProfile };
