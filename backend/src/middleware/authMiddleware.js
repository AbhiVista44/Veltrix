import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from './asyncHandler.js';

export const isAuthEnabled = () =>
  String(process.env.AUTH_ENABLED ?? 'true').toLowerCase() !== 'false';

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      'JWT_SECRET must be set (at least 16 characters) when AUTH_ENABLED is true.'
    );
  }
  return secret;
};

export const signAuthToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

/**
 * Verifies the Bearer JWT when AUTH_ENABLED is true.
 * When AUTH_ENABLED=false, allows open-access operation as guest admin.
 */
export const protect = asyncHandler(async (req, _res, next) => {
  if (!isAuthEnabled()) {
    req.user = {
      _id: null,
      name: 'Inventory Operator',
      email: '',
      role: 'admin',
      status: 'active',
      isGuestMode: true,
    };
    return next();
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please sign in.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch {
    throw new ApiError(401, 'Session expired or invalid token. Please sign in again.');
  }

  const user = await User.findById(decoded.sub);
  if (!user || user.status !== 'active') {
    throw new ApiError(401, 'Account is inactive or no longer exists.');
  }

  req.user = user;
  next();
});

/**
 * Restricts route access to specified roles when authentication is enabled.
 */
export const requireRole = (...allowedRoles) => (req, _res, next) => {
  if (!isAuthEnabled()) {
    return next();
  }

  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return next(
      new ApiError(
        403,
        `Access denied: ${allowedRoles.join(' or ')} role required for this action.`
      )
    );
  }

  return next();
};
