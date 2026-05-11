/**
 * Auth Middleware — JWT verification and role-based access control
 */
const { verifyToken } = require('../utils/jwt.utils');
const { sendError } = require('../utils/response.utils');
const User = require('../models/User.model');

/**
 * Verifies JWT from Authorization: Bearer <token>. Loads user and attaches to req.user.
 * Returns 401 if token missing, invalid, expired, or user not found/deactivated.
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return sendError(res, 'User not found. Token may be invalid.', 401);
    }
    if (!user.isActive) {
      return sendError(res, 'Account is deactivated.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token has expired. Please sign in again.', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid token.', 401);
    }
    return sendError(res, 'Authentication failed.', 401);
  }
};

/**
 * Factory: returns middleware that restricts access to given roles.
 * Must be used after protect. Returns 403 if req.user.role not in roles.
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. This endpoint is restricted to: ${roles.join(', ')}.`,
        403
      );
    }
    next();
  };
};

const requireSeeker = requireRole('seeker');
const requireRecruiter = requireRole('recruiter');

module.exports = { protect, requireRole, requireSeeker, requireRecruiter };
