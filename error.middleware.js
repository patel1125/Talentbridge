/**
 * Global Error Handler — Catches unhandled errors and returns consistent JSON.
 * Maps Mongoose ValidationError → 400 + errors array
 * Maps duplicate key (11000) → 409
 * Maps CastError (bad ObjectId) → 400
 * Adds stack trace in development only.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose validation error
  let errors = null;
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.entries(err.errors).map(([path, e]) => ({
      path,
      msg: e.message,
    }));
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  if (process.env.NODE_ENV === 'development' && err.stack) payload.stack = err.stack;
  res.status(statusCode).json(payload);
};

module.exports = { errorHandler };
