import { Product } from '../models/Product.js';
import { StockMovement } from '../models/StockMovement.js';
import { ApiError } from './ApiError.js';

/**
 * Atomically updates a product's stock quantity while preventing negative stock,
 * and records an immutable StockMovement audit entry.
 */
export const applyStockMovement = async ({
  productId,
  type,
  quantity,
  adjustmentMode = 'delta',
  quantityDelta: explicitDelta,
  newQuantityTarget,
  reason = '',
  reference = '',
  notes = '',
  performedBy = 'Inventory Operator',
}) => {
  const existingProduct = await Product.findById(productId);
  if (!existingProduct) {
    throw new ApiError(404, 'Product not found');
  }

  let delta = 0;

  if (type === 'stock_in') {
    delta = quantity;
  } else if (
    type === 'stock_out' ||
    type === 'damaged' ||
    type === 'expired' ||
    type === 'wasted'
  ) {
    delta = -quantity;
  } else if (type === 'adjustment') {
    if (adjustmentMode === 'set') {
      delta = newQuantityTarget - existingProduct.quantity;
      if (delta === 0) {
        throw new ApiError(
          400,
          `Stock quantity is already ${existingProduct.quantity} ${existingProduct.unit}. No adjustment needed.`,
          { newQuantity: 'New counted stock matches the current stock level' }
        );
      }
    } else {
      delta = explicitDelta;
    }
  } else {
    throw new ApiError(400, `Unsupported movement type: ${type}`);
  }

  if (!Number.isInteger(delta) || delta === 0) {
    throw new ApiError(400, 'Stock change must be a non-zero whole number');
  }

  let updatedProduct;

  if (delta > 0) {
    updatedProduct = await Product.findOneAndUpdate(
      { _id: productId },
      { $inc: { quantity: delta } },
      { new: true }
    );
  } else {
    const deductAmount = Math.abs(delta);
    // Conditional atomic update guarantees stock can never drop below zero even under concurrency
    updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, quantity: { $gte: deductAmount } },
      { $inc: { quantity: -deductAmount } },
      { new: true }
    );

    if (!updatedProduct) {
      const latest = await Product.findById(productId).select('quantity unit name');
      if (!latest) {
        throw new ApiError(404, 'Product not found');
      }
      throw new ApiError(
        400,
        `Insufficient stock for "${latest.name}": available ${latest.quantity} ${latest.unit}, requested deduction ${deductAmount} ${latest.unit}.`,
        {
          quantity: `Cannot deduct ${deductAmount} ${latest.unit} (only ${latest.quantity} available)`,
        }
      );
    }
  }

  const newQuantity = updatedProduct.quantity;
  const previousQuantity = newQuantity - delta;
  const absQty = Math.abs(delta);
  const unitPriceSnapshot = Number(updatedProduct.price || 0);
  const totalValue = Number((unitPriceSnapshot * absQty).toFixed(2));

  let movement;
  try {
    movement = await StockMovement.create({
      product: updatedProduct._id,
      productSnapshot: {
        name: updatedProduct.name,
        sku: updatedProduct.sku,
        unit: updatedProduct.unit,
      },
      type,
      quantity: absQty,
      quantityDelta: delta,
      previousQuantity,
      newQuantity,
      unitPriceSnapshot,
      totalValue,
      reason,
      reference,
      notes,
      performedBy: performedBy || 'Inventory Operator',
    });
  } catch (error) {
    // Compensate product quantity if audit log persistence fails
    await Product.findByIdAndUpdate(productId, { $inc: { quantity: -delta } });
    throw error;
  }

  await updatedProduct.populate([
    { path: 'category', select: 'name status' },
    { path: 'supplier', select: 'name contactPerson status' },
  ]);

  await movement.populate('product', 'name sku unit quantity reorderLevel');

  return { product: updatedProduct, movement };
};
