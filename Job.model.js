/**
 * Job Model — Job listings created by recruiters
 * Status: draft | active | paused | closed. Denormalizes companySnapshot for performance.
 */
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    // ── Ownership ──
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── Core Info ──
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
    },
    responsibilities: {
      type: [String],
      validate: [arr => arr.length > 0, 'At least one responsibility is required'],
    },
    qualifications: {
      type: [String],
      validate: [arr => arr.length > 0, 'At least one qualification is required'],
    },
    niceToHave: [String],

    // ── Classification ──
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
      required: true,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    skills: [{ type: String, trim: true }],

    // ── Location ──
    location: {
      city: String,
      state: String,
      country: { type: String, default: 'US' },
      remote: { type: Boolean, default: false },
      hybrid: { type: Boolean, default: false },
    },

    // ── Salary ──
    salary: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
      currency: { type: String, default: 'USD' },
      period: { type: String, enum: ['hourly', 'monthly', 'yearly'], default: 'yearly' },
      disclosed: { type: Boolean, default: true },
    },

    // ── Status & Visibility ──
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'closed'],
      default: 'active',
    },
    applicationDeadline: Date,
    startDate: Date,

    // ── Company snapshot (denormalized for performance) ──
    companySnapshot: {
      name: String,
      logo: String,
      industry: String,
      size: String,
      website: String,
    },

    // ── Stats ──
    viewCount: { type: Number, default: 0 },
    applicationCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual: location string ──
jobSchema.virtual('locationString').get(function () {
  if (this.location.remote) return 'Remote';
  const parts = [this.location.city, this.location.state, this.location.country].filter(Boolean);
  return parts.join(', ');
});

// ── Virtual: salary range string ──
jobSchema.virtual('salaryRange').get(function () {
  if (!this.salary.disclosed) return 'Not disclosed';
  const fmt = (n) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  if (this.salary.min && this.salary.max) {
    return `${fmt(this.salary.min)} – ${fmt(this.salary.max)}/${this.salary.period === 'yearly' ? 'yr' : this.salary.period}`;
  }
  return 'Competitive';
});

// ── Indexes ──
jobSchema.index({ recruiter: 1, status: 1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ title: 'text', description: 'text', 'companySnapshot.name': 'text' });
jobSchema.index({ 'location.remote': 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ category: 1 });

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;
