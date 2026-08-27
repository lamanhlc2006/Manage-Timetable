import { Schema, model } from 'mongoose';
import { ITag } from '../types';

const TagSchema = new Schema<ITag>(
  {
    name: {
      type: String,
      required: [true, 'Please provide a tag name'],
      trim: true,
    },
    color: {
      type: String,
      default: '#1890ff',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tag must belong to a user'],
    },
  },
  {
    timestamps: true,
  }
);

TagSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export const Tag = model<ITag>('Tag', TagSchema);
