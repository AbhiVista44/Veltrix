import mongoose from 'mongoose';

export const MOVEMENT_TYPES = [
  'stock_in',
  'stock_out',
  'adjustment',
  'damaged',
  'expired',
  'wasted',
];

export const LOSS_MOVEMENT_TYPES = ['damaged', 'expired', 'wasted'];

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
    },
    productSnapshot: {
      name: { type: String, required: true, trim: true },
      sku: { type: String, required: true, trim: true },
      unit: { type: String, required: true, trim: true },
    },
    type: {
      type: String,
      enum: {
        values: MOVEMENT_TYPES,
        message: `Movement type must be one of: ${MOVEMENT_TYPES.join(', ')}`,
      },
      required: [true, 'Movement type is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Movement quantity is required'],
      min: [1, 'Movement quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Movement quantity must be a whole number',
      },
    },
    quantityDelta: {
      type: Number,
      required: [true, 'Quantity delta is required'],
      validate: {
        validator: (val) => Number.isInteger(val) && val !== 0,
        message: 'Quantity delta must be a non-zero whole number',
      },
    },
    previousQuantity: {
      type: Number,
      required: true,
      min: [0, 'Previous quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Previous quantity must be a whole number',
      },
    },
    newQuantity: {
      type: Number,
      required: true,
      min: [0, 'Resulting quantity cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'New quantity must be a whole number',
      },
    },
    unitPriceSnapshot: {
      type: Number,
      required: true,
      min: [0, 'Unit price snapshot cannot be negative'],
    },
    totalValue: {
      type: Number,
      required: true,
      min: [0, 'Total value cannot be negative'],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [200, 'Reason cannot exceed 200 characters'],
      default: '',
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [80, 'Reference cannot exceed 80 characters'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    performedBy: {
      type: String,
      trim: true,
      maxlength: [100, 'Performed by cannot exceed 100 characters'],
      default: 'Inventory Operator',
    },
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

export const StockMovement = mongoose.model(
  'StockMovement',
  stockMovementSchema
);
