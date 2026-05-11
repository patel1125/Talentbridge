/**
 * Application Model — Job applications from seekers to jobs
 * Snapshot of applicant at apply time. Status: applied → under-review → shortlisted → interview → offered → hired|rejected
 */
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    // ── References ──
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Application Content ──
    coverLetter: {
      type: String,
      maxlength: [3000, 'Cover letter cannot exceed 3000 characters'],
    },
    resumeFile: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now },
    },
    // Snapshot of seeker profile at time of application
    applicantSnapshot: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      headline: String,
      skills: [String],
      location: String,
      linkedinUrl: String,
      portfolioUrl: String,
    },

    // ── Status Tracking ──
    status: {
      type: String,
      enum: ['applied', 'under-review', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn'],
      default: 'applied',
    },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        note: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // ── Recruiter Notes ──
    recruiterNotes: {
      type: String,
      maxlength: 2000,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },

    // ── Seeker Read Status ──
    seekerViewed: { type: Boolean, default: true },
    recruiterViewed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// ── Compound Index: one application per job per seeker ──
applicationSchema.index({ job: 1, seeker: 1 }, { unique: true });
applicationSchema.index({ seeker: 1, createdAt: -1 });
applicationSchema.index({ recruiter: 1, status: 1 });
applicationSchema.index({ job: 1, status: 1 });

const Application = mongoose.model('Application', applicationSchema);
module.exports = Application;
