import mongoose from 'mongoose';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      minlength: [2, 'Supplier name must be at least 2 characters'],
      maxlength: [120, 'Supplier name cannot exceed 120 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact person name cannot exceed 100 characters'],
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      validate: {
        validator: (value) => !value || EMAIL_REGEX.test(value),
        message: 'Please provide a valid email address',
      },
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [30, 'Phone number cannot exceed 30 characters'],
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
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
  }
);

supplierSchema.pre('validate', function () {
  if (typeof this.name === 'string') {
    this.normalizedName = this.name.trim().toLowerCase();
  }
});

supplierSchema.index({ name: 1 });
supplierSchema.index({ status: 1 });

export const Supplier = mongoose.model('Supplier', supplierSchema);
