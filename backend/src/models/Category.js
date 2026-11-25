import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [80, 'Category name cannot exceed 80 characters'],
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
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

categorySchema.pre('validate', function () {
  if (typeof this.name === 'string') {
    this.normalizedName = this.name.trim().toLowerCase();
  }
});

categorySchema.index({ name: 1 });
categorySchema.index({ status: 1 });

export const Category = mongoose.model('Category', categorySchema);
