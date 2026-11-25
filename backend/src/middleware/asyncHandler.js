/**
 * Wraps async Express route handlers so rejected promises pass cleanly
 * to the centralized error middleware.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
