import { Schema, model, Document, Types } from 'mongoose';

export interface IShareLink extends Document {
  token: string;
  createdBy: Types.ObjectId;
  permission: 'view';
  expiresAt?: Date;
  password?: string;
  label?: string;
  isActive: boolean;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    permission: {
      type: String,
      enum: ['view'],
      default: 'view',
    },
    expiresAt: {
      type: Date,
    },
    password: {
      type: String,
    },
    label: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    accessCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire index
ShareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } });

export const ShareLink = model<IShareLink>('ShareLink', ShareLinkSchema);
