import mongoose from 'mongoose';

export const PRODUCT_UNITS = ['pcs', 'box', 'kg', 'g', 'ltr', 'pack', 'set'];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
      unique: true,
      minlength: [2, 'SKU must be at least 2 characters'],
      maxlength: [50, 'SKU cannot exceed 50 characters'],
      match: [
        /^[A-Z0-9._-]+$/,
        'SKU may only contain letters, numbers, hyphens, underscores, and dots',
      ],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'Supplier is required'],
    },
    price: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },
    reorderLevel: {
      type: Number,
      required: [true, 'Reorder level is required'],
      min: [0, 'Reorder level cannot be negative'],
      default: 10,
      validate: {
        validator: Number.isInteger,
        message: 'Reorder level must be a whole number',
      },
    },
    unit: {
      type: String,
      trim: true,
      enum: {
        values: PRODUCT_UNITS,
        message: `Unit must be one of: ${PRODUCT_UNITS.join(', ')}`,
      },
      default: 'pcs',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be either active or inactive',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual('stockStatus').get(function () {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= this.reorderLevel) return 'low_stock';
  return 'in_stock';
});

productSchema.virtual('stockValue').get(function () {
  return Number(((this.price || 0) * (this.quantity || 0)).toFixed(2));
});

productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ supplier: 1 });
productSchema.index({ quantity: 1, reorderLevel: 1 });
productSchema.index({ status: 1 });
productSchema.index({ createdAt: -1 });

export const Product = mongoose.model('Product', productSchema);
