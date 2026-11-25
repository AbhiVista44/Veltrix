import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  buildPaginationMeta,
  escapeRegex,
  parsePagination,
  parseSort,
} from '../utils/queryHelpers.js';
import {
  assertValidObjectId,
  validateRegisterPayload,
  validateUserUpdatePayload,
} from '../utils/validators.js';

const ALLOWED_SORT_FIELDS = ['name', 'email', 'role', 'status', 'createdAt'];

export const getUsers = asyncHandler(async (req, res) => {
  const filter = {};
  const { search, role, status } = req.query;

  if (typeof search === 'string' && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }
  if (role && ['admin', 'staff'].includes(role)) {
    filter.role = role;
  }
  if (status && ['active', 'inactive'].includes(status)) {
    filter.status = status;
  }

  const { page, limit, skip } = parsePagination(req.query, 10, 100);
  const { sortObject } = parseSort(req.query, ALLOWED_SORT_FIELDS);

  const [items, total] = await Promise.all([
    User.find(filter).sort(sortObject).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = validateRegisterPayload(req.body, {
    allowRole: true,
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await User.create({
    name,
    email,
    passwordHash,
    role,
    status: 'active',
  });

  const userObj = created.toObject();
  delete userObj.passwordHash;

  res.status(201).json({
    success: true,
    message: `${role === 'admin' ? 'Admin' : 'Staff'} user created successfully`,
    data: userObj,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'User');
  const updates = validateUserUpdatePayload(req.body);

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isSelf = req.user?._id && String(req.user._id) === String(user._id);
  if (isSelf && (updates.status === 'inactive' || updates.role === 'staff')) {
    throw new ApiError(
      400,
      'You cannot deactivate or remove admin privileges from your own active account.'
    );
  }

  Object.assign(user, updates);
  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user,
  });
});
