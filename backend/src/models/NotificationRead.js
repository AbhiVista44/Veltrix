import mongoose from 'mongoose';

const notificationReadSchema = new mongoose.Schema(
  {
    notificationKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const NotificationRead = mongoose.model(
  'NotificationRead',
  notificationReadSchema
);
