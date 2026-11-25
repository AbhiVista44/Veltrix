import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, _req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path || 'resource'} ID format`;
  }

  // Mongoose schema validation failure
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed. Please check the submitted fields.';
    errors = Object.entries(err.errors).reduce((acc, [field, detail]) => {
      acc[field] = detail.message;
      return acc;
    }, {});
  }

  // MongoDB duplicate key (unique index)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicateKey = Object.keys(err.keyPattern || err.keyValue || {})[0];
    const friendlyField =
      duplicateKey === 'normalizedName' ? 'name' : duplicateKey || 'field';
    message = `A record with this ${friendlyField} already exists.`;
    errors = { [friendlyField]: message };
  }

  if (statusCode >= 500) {
    console.error('Server Error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500
      ? { stack: err.stack }
      : {}),
  });
};
