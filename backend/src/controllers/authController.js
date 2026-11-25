import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { isAuthEnabled, signAuthToken } from '../middleware/authMiddleware.js';
import { ApiError } from '../utils/ApiError.js';
import {
  validateLoginPayload,
  validatePasswordChangePayload,
  validateRegisterPayload,
} from '../utils/validators.js';

const formatUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

export const getAuthStatus = asyncHandler(async (_req, res) => {
  const authEnabled = isAuthEnabled();
  const userCount = authEnabled ? await User.countDocuments() : 0;

  res.json({
    success: true,
    data: {
      authEnabled,
      hasUsers: userCount > 0,
    },
  });
});

export const setupInitialAdmin = asyncHandler(async (req, res) => {
  if (!isAuthEnabled()) {
    throw new ApiError(400, 'Authentication is disabled (AUTH_ENABLED=false).');
  }

  const existingCount = await User.countDocuments();
  if (existingCount > 0) {
    throw new ApiError(
      403,
      'Initial setup is already complete. Contact an Admin to create an account.'
    );
  }

  const { name, email, password } = validateRegisterPayload(req.body);
  const passwordHash = await bcrypt.hash(password, 12);

  const adminUser = await User.create({
    name,
    email,
    passwordHash,
    role: 'admin',
    status: 'active',
    lastLoginAt: new Date(),
  });

  const token = signAuthToken(adminUser);

  res.status(201).json({
    success: true,
    message: 'Admin account created successfully',
    data: {
      token,
      user: formatUser(adminUser),
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  if (!isAuthEnabled()) {
    throw new ApiError(400, 'Authentication is disabled (AUTH_ENABLED=false).');
  }

  const { email, password } = validateLoginPayload(req.body);

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.status !== 'active') {
    throw new ApiError(
      403,
      'Your account is inactive. Contact an administrator.'
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signAuthToken(user);

  res.json({
    success: true,
    message: 'Signed in successfully',
    data: {
      token,
      user: formatUser(user),
    },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      authEnabled: isAuthEnabled(),
      user: req.user?.isGuestMode ? req.user : formatUser(req.user),
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  if (!isAuthEnabled() || req.user?.isGuestMode) {
    throw new ApiError(400, 'Password changes require active JWT authentication.');
  }

  const { currentPassword, newPassword } = validatePasswordChangePayload(req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new ApiError(400, 'Current password is incorrect', {
      currentPassword: 'Incorrect current password',
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({
    success: true,
    message: 'Password updated successfully',
  });
});
