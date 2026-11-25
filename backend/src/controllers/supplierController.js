import { Supplier } from '../models/Supplier.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  assertValidObjectId,
  validateSupplierPayload,
} from '../utils/validators.js';
import {
  ensureNoLinkedProducts,
  getByIdWithProductCount,
  listWithProductCount,
} from '../utils/masterDataHelpers.js';

export const getSuppliers = asyncHandler(async (req, res) => {
  const { items, pagination } = await listWithProductCount({
    Model: Supplier,
    productForeignKey: 'supplier',
    searchFields: ['name', 'contactPerson', 'email', 'phone'],
    allowedSortFields: [
      'name',
      'contactPerson',
      'status',
      'productCount',
      'createdAt',
      'updatedAt',
    ],
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

export const getSupplierById = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Supplier');
  const supplier = await getByIdWithProductCount({
    Model: Supplier,
    id: req.params.id,
    productForeignKey: 'supplier',
    label: 'Supplier',
  });

  res.json({ success: true, data: supplier });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const payload = validateSupplierPayload(req.body);
  const supplier = await Supplier.create(payload);

  const responseObj = supplier.toObject();
  delete responseObj.normalizedName;

  res.status(201).json({
    success: true,
    message: 'Supplier created successfully',
    data: { ...responseObj, productCount: 0 },
  });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Supplier');
  const payload = validateSupplierPayload(req.body);

  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  Object.assign(supplier, payload);
  await supplier.save();

  const updated = await getByIdWithProductCount({
    Model: Supplier,
    id: supplier._id,
    productForeignKey: 'supplier',
    label: 'Supplier',
  });

  res.json({
    success: true,
    message: 'Supplier updated successfully',
    data: updated,
  });
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  assertValidObjectId(req.params.id, 'Supplier');

  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) {
    throw new ApiError(404, 'Supplier not found');
  }

  await ensureNoLinkedProducts({
    id: supplier._id,
    productForeignKey: 'supplier',
    label: 'Supplier',
  });

  await supplier.deleteOne();

  res.json({
    success: true,
    message: 'Supplier deleted successfully',
  });
});
