import { Schema, model, Types } from 'mongoose';

export interface IRefreshToken {
  token: string;
  user: Types.ObjectId;
  expiresAt: Date;
  isRevoked: boolean;
  replacedByToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    replacedByToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

RefreshTokenSchema.index({ token: 1 });
RefreshTokenSchema.index({ user: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Automatic TTL expiration

export const RefreshToken = model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
