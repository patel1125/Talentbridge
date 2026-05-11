/**
 * Auth Controller — Registration, login, get current user, change password
 */
const { validationResult } = require('express-validator');
const User = require('../models/User.model');
const { generateToken, createTokenPayload } = require('../utils/jwt.utils');
const { sendSuccess, sendError } = require('../utils/response.utils');

/**
 * Creates new user (seeker or recruiter). Recruiters require companyName.
 * Returns JWT + user. Password hashed via User model pre-save hook.
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { firstName, lastName, email, password, role, companyName } = req.body;

    // Check existing user
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return sendError(res, 'An account with this email already exists.', 409);
    }

    // Build user object
    const userData = { firstName, lastName, email, password, role };

    if (role === 'recruiter') {
      if (!companyName) {
        return sendError(res, 'Company name is required for recruiter accounts.', 400);
      }
      userData.recruiterProfile = { companyName };
    }

    const user = await User.create(userData);
    const freshUser = await User.findById(user._id);
    const token = generateToken(createTokenPayload(freshUser));

    return sendSuccess(
      res,
      { token, user: freshUser.toSafeObject() },
      'Account created successfully.',
      201
    );
  } catch (err) {
    console.error('Register error:', err.name, err.message, err.errors || '');
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      return sendError(res, messages, 400);
    }
    if (err.code === 11000) return sendError(res, 'Email already exists.', 409);
    return sendError(res, 'Registration failed. Please try again.', 500);
  }
};

/**
 * Authenticates user by email/password. Returns JWT + user.
 * Uses comparePassword for secure check. Rejects inactive accounts.
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendError(res, 'Validation failed', 400, errors.array());
    }

    const { email, password } = req.body;

    // Select password explicitly (it's excluded by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Your account has been deactivated. Please contact support.', 403);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401);
    }

    const token = generateToken(createTokenPayload(user));

    return sendSuccess(res, { token, user: user.toSafeObject() }, 'Signed in successfully.');
  } catch (err) {
    console.error('Login error:', err);
    return sendError(res, 'Login failed. Please try again.', 500);
  }
};

/** Returns current user from req.user (set by protect middleware) */
const getMe = async (req, res) => {
  try {
    return sendSuccess(res, { user: req.user.toSafeObject() }, 'User fetched.');
  } catch (err) {
    return sendError(res, 'Could not fetch user.', 500);
  }
};

/** Verifies current password, then sets new password (hashed by pre-save hook) */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return sendError(res, 'Both current and new password are required.', 400);
    }
    if (newPassword.length < 8) {
      return sendError(res, 'New password must be at least 8 characters.', 400);
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 'Current password is incorrect.', 401);
    }

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    return sendSuccess(res, {}, 'Password changed successfully.');
  } catch (err) {
    return sendError(res, 'Could not change password.', 500);
  }
};

module.exports = { register, login, getMe, changePassword };
