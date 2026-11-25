import { Category } from '../models/Category.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  assertValidObjectId,
  validateCategoryPayload,
} from '../utils/validators.js';
import {
  ensureNoLinkedProducts,
  getByIdWithProductCount,
  listWithProductCount,
} from '../utils/masterDataHelpers.js';

export const getCategories = asyncHandler(async (req, res) => {
  const { items, pagination } = await listWithProductCount({
    Model: Category,
    productForeignKey: 'category',
    searchFields: ['name', 'description'],
    allowedSortFields: ['name', 'status', 'productCount', 'createdAt', 'updatedAt'],
    query: req.query,
    defaultSortField: 'createdAt',
    defaultSortOrder: 'desc',
  });

  res.json({
    success: true,
    data: items,
    ...(pagination ? { pagination } : {}),
  });
});

export const getCategoryById = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Category');
  const category = await getByIdWithProductCount({
    Model: Category,
    id: req.params.id,
    productForeignKey: 'category',
    label: 'Category',
  });

  res.json({ success: true, data: category });
});

export const createCategory = asyncHandler(async (req, res) => {
  const payload = validateCategoryPayload(req.body);
  const category = await Category.create(payload);

  const responseObj = category.toObject();
  delete responseObj.normalizedName;

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: { ...responseObj, productCount: 0 },
  });
});

export const updateCategory = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Category');
  const payload = validateCategoryPayload(req.body);

  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  Object.assign(category, payload);
  await category.save();

  const updated = await getByIdWithProductCount({
    Model: Category,
    id: category._id,
    productForeignKey: 'category',
    label: 'Category',
  });

  res.json({
    success: true,
    message: 'Category updated successfully',
    data: updated,
  });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Category');

  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  await ensureNoLinkedProducts({
    id: category._id,
    productForeignKey: 'category',
    label: 'Category',
  });

  await category.deleteOne();

  res.json({
    success: true,
    message: 'Category deleted successfully',
  });
});
