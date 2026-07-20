import { Schema, model } from 'mongoose';
import { ICategory } from '../types';

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      trim: true,
    },
    color: {
      type: String,
      default: '#1890ff',
    },
    icon: {
      type: String,
      default: '📌',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

CategorySchema.index({ name: 1 });

export const Category = model<ICategory>('Category', CategorySchema);
