import mongoose from 'mongoose';
import { ApiError } from './ApiError.js';
import { PRODUCT_UNITS } from '../models/Product.js';
import { MOVEMENT_TYPES } from '../models/StockMovement.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SKU_REGEX = /^[A-Z0-9._-]+$/;
const VALID_STATUSES = ['active', 'inactive'];
const REASON_REQUIRED_TYPES = ['adjustment', 'damaged', 'expired', 'wasted'];

export const assertValidObjectId = (id, label = 'Resource') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, `Invalid ${label} ID format`);
  }
};

const validateStatus = (status, errors) => {
  const normalized = status === undefined || status === '' ? 'active' : String(status).trim();
  if (!VALID_STATUSES.includes(normalized)) {
    errors.status = 'Status must be active or inactive';
  }
  return normalized;
};

export const validateCategoryPayload = (body = {}) => {
  const errors = {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const status = validateStatus(body.status, errors);

  if (name.length < 2 || name.length > 80) {
    errors.name = 'Category name must be between 2 and 80 characters';
  }
  if (description.length > 300) {
    errors.description = 'Description cannot exceed 300 characters';
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, 'Please fix the highlighted category fields', errors);
  }

  return { name, description, status };
};

export const validateSupplierPayload = (body = {}) => {
  const errors = {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const contactPerson =
    typeof body.contactPerson === 'string' ? body.contactPerson.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const address = typeof body.address === 'string' ? body.address.trim() : '';
  const status = validateStatus(body.status, errors);

  if (name.length < 2 || name.length > 120) {
    errors.name = 'Supplier name must be between 2 and 120 characters';
  }
  if (contactPerson.length > 100) {
    errors.contactPerson = 'Contact person cannot exceed 100 characters';
  }
  if (email && !EMAIL_REGEX.test(email)) {
    errors.email = 'Please enter a valid email address';
  }
  if (phone.length > 30) {
    errors.phone = 'Phone number cannot exceed 30 characters';
  }
  if (address.length > 300) {
    errors.address = 'Address cannot exceed 300 characters';
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, 'Please fix the highlighted supplier fields', errors);
  }

  return { name, contactPerson, email, phone, address, status };
};

export const validateProductPayload = (body = {}) => {
  const errors = {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : '';
  const category = body.category ? String(body.category).trim() : '';
  const supplier = body.supplier ? String(body.supplier).trim() : '';
  const unit = body.unit === undefined || body.unit === '' ? 'pcs' : String(body.unit).trim();
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const status = validateStatus(body.status, errors);

  const price = Number(body.price);
  const quantity = Number(body.quantity);
  const reorderLevel =
    body.reorderLevel === undefined || body.reorderLevel === ''
      ? 10
      : Number(body.reorderLevel);

  if (name.length < 2 || name.length > 150) {
    errors.name = 'Product name must be between 2 and 150 characters';
  }
  if (sku.length < 2 || sku.length > 50 || !SKU_REGEX.test(sku)) {
    errors.sku =
      'SKU must be 2-50 characters using letters, numbers, hyphens, underscores, or dots';
  }
  if (!category || !mongoose.Types.ObjectId.isValid(category)) {
    errors.category = 'Please select a valid category';
  }
  if (!supplier || !mongoose.Types.ObjectId.isValid(supplier)) {
    errors.supplier = 'Please select a valid supplier';
  }
  if (body.price === '' || body.price === undefined || body.price === null || !Number.isFinite(price) || price < 0) {
    errors.price = 'Price must be a valid number of 0 or greater';
  }
  if (
    body.quantity === '' ||
    body.quantity === undefined ||
    body.quantity === null ||
    !Number.isInteger(quantity) ||
    quantity < 0
  ) {
    errors.quantity = 'Quantity must be a whole number of 0 or greater';
  }
  if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
    errors.reorderLevel = 'Reorder level must be a whole number of 0 or greater';
  }
  if (!PRODUCT_UNITS.includes(unit)) {
    errors.unit = `Unit must be one of: ${PRODUCT_UNITS.join(', ')}`;
  }
  if (description.length > 500) {
    errors.description = 'Description cannot exceed 500 characters';
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, 'Please fix the highlighted product fields', errors);
  }

  return {
    name,
    sku,
    category,
    supplier,
    price: Math.round(price * 100) / 100,
    quantity,
    reorderLevel,
    unit,
    description,
    status,
  };
};

export const validateStockMovementPayload = (body = {}) => {
  const errors = {};

  const productId = body.product ? String(body.product).trim() : '';
  const type = typeof body.type === 'string' ? body.type.trim() : '';
  const adjustmentMode = body.adjustmentMode === 'set' ? 'set' : 'delta';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const reference = typeof body.reference === 'string' ? body.reference.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  const performedBy =
    typeof body.performedBy === 'string' && body.performedBy.trim()
      ? body.performedBy.trim()
      : 'Inventory Operator';

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    errors.product = 'Please select a valid product';
  }

  if (!MOVEMENT_TYPES.includes(type)) {
    errors.type = `Movement type must be one of: ${MOVEMENT_TYPES.join(', ')}`;
  }

  let quantity;
  let quantityDelta;
  let newQuantityTarget;

  if (type === 'adjustment' && adjustmentMode === 'set') {
    const parsedTarget = Number(body.newQuantity);
    if (
      body.newQuantity === '' ||
      body.newQuantity === undefined ||
      body.newQuantity === null ||
      !Number.isInteger(parsedTarget) ||
      parsedTarget < 0
    ) {
      errors.newQuantity = 'New stock count must be a whole number of 0 or greater';
    } else {
      newQuantityTarget = parsedTarget;
    }
  } else if (type === 'adjustment') {
    const parsedDelta = Number(body.quantityDelta ?? body.quantity);
    if (
      (body.quantityDelta === '' || body.quantityDelta === undefined) &&
      (body.quantity === '' || body.quantity === undefined)
    ) {
      errors.quantity = 'Adjustment quantity (+/-) is required';
    } else if (!Number.isInteger(parsedDelta) || parsedDelta === 0) {
      errors.quantity = 'Adjustment must be a non-zero whole number (e.g. 5 or -3)';
    } else {
      quantityDelta = parsedDelta;
      quantity = Math.abs(parsedDelta);
    }
  } else {
    const parsedQty = Number(body.quantity);
    if (
      body.quantity === '' ||
      body.quantity === undefined ||
      body.quantity === null ||
      !Number.isInteger(parsedQty) ||
      parsedQty < 1
    ) {
      errors.quantity = 'Quantity must be a whole number of at least 1';
    } else {
      quantity = parsedQty;
    }
  }

  if (REASON_REQUIRED_TYPES.includes(type) && reason.length < 3) {
    errors.reason = 'Please provide a reason (at least 3 characters)';
  } else if (reason.length > 200) {
    errors.reason = 'Reason cannot exceed 200 characters';
  }

  if (reference.length > 80) {
    errors.reference = 'Reference cannot exceed 80 characters';
  }
  if (notes.length > 500) {
    errors.notes = 'Notes cannot exceed 500 characters';
  }
  if (performedBy.length > 100) {
    errors.performedBy = 'Operator name cannot exceed 100 characters';
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, 'Please fix the highlighted stock movement fields', errors);
  }

  return {
    productId,
    type,
    adjustmentMode,
    quantity,
    quantityDelta,
    newQuantityTarget,
    reason,
    reference,
    notes,
    performedBy,
  };
};
