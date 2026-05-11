/**
 * API Response Helpers — Consistent JSON responses for all endpoints
 */

/**
 * Sends a success response with optional data and message.
 * @param {object} res - Express response object
 * @param {object} data - Payload to return (default {})
 * @param {string} message - Success message (default 'Success')
 * @param {number} statusCode - HTTP status (default 200)
 */
const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Sends an error response. Optionally includes validation errors array.
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status (default 500)
 * @param {array|null} errors - Validation errors [{ path, msg }] (optional)
 */
const sendError = (res, message = 'Server error', statusCode = 500, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

/**
 * Sends a paginated list response (used for job lists, applications, etc.).
 * @param {object} res - Express response object
 * @param {array} data - Array of items
 * @param {object} pagination - { page, limit, total, pages }
 * @param {string} message - Success message (default 'Success')
 */
const sendPaginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
