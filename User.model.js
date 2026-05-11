/**
 * User Model — Job seekers and recruiters (employers)
 * Roles: seeker | recruiter. Contains seekerProfile or recruiterProfile based on role.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // ── Core Auth ──
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Never return password in queries
    },
    role: {
      type: String,
      enum: ['seeker', 'recruiter'],
      required: [true, 'Role is required'],
    },

    // ── Common Fields ──
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[+]?[\d\s\-().]{7,20}$/, 'Please enter a valid phone number'],
    },
    profilePhoto: {
      type: String, // File path or URL
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Job Seeker Profile ──
    seekerProfile: {
      headline: { type: String, maxlength: 120 },
      bio: { type: String, maxlength: 2000 },
      location: { type: String, maxlength: 100 },
      skills: [{ type: String, trim: true }],
      experience: [
        {
          company: String,
          title: String,
          startDate: Date,
          endDate: Date,
          current: { type: Boolean, default: false },
          description: String,
        },
      ],
      education: [
        {
          institution: String,
          degree: String,
          field: String,
          startYear: Number,
          endYear: Number,
        },
      ],
      resumeFile: {
        filename: String,      // stored filename on disk
        originalName: String,  // original upload name
        mimetype: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
      linkedinUrl: String,
      portfolioUrl: String,
      githubUrl: String,
      expectedSalary: {
        min: Number,
        max: Number,
        currency: { type: String, default: 'USD' },
      },
      jobTypes: [{ type: String, enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'] }],
      availability: {
        type: String,
        enum: ['immediately', '2-weeks', '1-month', '3-months', 'not-looking'],
        default: 'immediately',
      },
    },

    // ── Recruiter / Employer Profile ──
    recruiterProfile: {
      companyName: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      companyLogo: { type: String, default: null },
      companyWebsite: String,
      companyDescription: { type: String, maxlength: 3000 },
      industry: String,
      companySize: {
        type: String,
        enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
      },
      foundedYear: Number,
      headquarters: String,
      linkedinUrl: String,
      twitterUrl: String,
      jobTitle: String, // recruiter's title within company
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ── Pre-save: Hash Password ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance Method: Compare Password ──
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance Method: Safe Profile (no password) ──
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

// ── Indexes ──
userSchema.index({ role: 1 });
userSchema.index({ 'recruiterProfile.companyName': 'text' });

const User = mongoose.model('User', userSchema);
module.exports = User;
