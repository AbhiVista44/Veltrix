import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
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
  validateProductPayload,
} from '../utils/validators.js';

const ALLOWED_SORT_FIELDS = [
  'name',
  'sku',
  'price',
  'quantity',
  'reorderLevel',
  'status',
  'createdAt',
  'updatedAt',
];

const ensureCategoryAndSupplierExist = async (categoryId, supplierId) => {
  const [categoryExists, supplierExists] = await Promise.all([
    Category.exists({ _id: categoryId }),
    Supplier.exists({ _id: supplierId }),
  ]);

  const errors = {};
  if (!categoryExists) {
    errors.category = 'Selected category does not exist';
  }
  if (!supplierExists) {
    errors.supplier = 'Selected supplier does not exist';
  }
  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, 'Invalid category or supplier reference', errors);
  }
};

export const getProducts = asyncHandler(async (req, res) => {
  const filter = {};
  const { search, category, supplier, status, stockStatus } = req.query;

  if (typeof search === 'string' && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: regex }, { sku: regex }, { description: regex }];
  }

  if (category) {
    assertValidObjectId(category, 'Category');
    filter.category = new mongoose.Types.ObjectId(category);
  }

  if (supplier) {
    assertValidObjectId(supplier, 'Supplier');
    filter.supplier = new mongoose.Types.ObjectId(supplier);
  }

  if (status && ['active', 'inactive'].includes(status)) {
    filter.status = status;
  }

  if (stockStatus === 'out_of_stock') {
    filter.quantity = 0;
  } else if (stockStatus === 'low_stock') {
    filter.$expr = {
      $and: [
        { $gt: ['$quantity', 0] },
        { $lte: ['$quantity', '$reorderLevel'] },
      ],
    };
  } else if (stockStatus === 'in_stock') {
    filter.$expr = { $gt: ['$quantity', '$reorderLevel'] };
  }

  const { page, limit, skip } = parsePagination(req.query, 10, 100);
  const { sortObject } = parseSort(req.query, ALLOWED_SORT_FIELDS);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name status')
      .populate('supplier', 'name contactPerson status')
      .sort(sortObject)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

export const getProductById = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Product');

  const product = await Product.findById(req.params.id)
    .populate('category', 'name status')
    .populate('supplier', 'name contactPerson status');

  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req, res) => {
  const payload = validateProductPayload(req.body);
  await ensureCategoryAndSupplierExist(payload.category, payload.supplier);

  const product = await Product.create(payload);
  await product.populate([
    { path: 'category', select: 'name status' },
    { path: 'supplier', select: 'name contactPerson status' },
  ]);

  res.status(201).json({
    success: true,
    message: 'Product created successfully',
    data: product,
  });
});

export const updateProduct = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Product');
  const payload = validateProductPayload(req.body);

  const product = await Product.findById(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  await ensureCategoryAndSupplierExist(payload.category, payload.supplier);

  Object.assign(product, payload);
  await product.save();
  await product.populate([
    { path: 'category', select: 'name status' },
    { path: 'supplier', select: 'name contactPerson status' },
  ]);

  res.json({
    success: true,
    message: 'Product updated successfully',
    data: product,
  });
});

export const deleteProduct = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Product');

  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  res.json({
    success: true,
    message: 'Product deleted successfully',
  });
});
