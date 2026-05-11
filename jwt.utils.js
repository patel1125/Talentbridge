/**
 * JWT Utilities — Token creation and verification for session-based auth
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Creates a signed JWT containing user id, email, role. Expires in 7 days by default.
 * @param {object} payload - { id, email, role }
 * @returns {string} Signed JWT
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifies JWT signature and returns decoded payload. Throws if invalid or expired.
 * @param {string} token - JWT string
 * @returns {object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Builds minimal payload for JWT: id, email, role (excludes sensitive fields).
 * @param {object} user - Mongoose user document
 * @returns {object} { id, email, role }
 */
const createTokenPayload = (user) => ({
  id: user._id.toString(),
  email: user.email,
  role: user.role,
});

module.exports = { generateToken, verifyToken, createTokenPayload };
