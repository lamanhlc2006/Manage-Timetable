import { Schema, model, Types } from 'mongoose';

export interface IPushSubscription {
  user: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Push subscription must belong to a user'],
    },
    endpoint: {
      type: String,
      required: [true, 'Subscription endpoint is required'],
      unique: true,
    },
    keys: {
      p256dh: {
        type: String,
        required: [true, 'p256dh key is required'],
      },
      auth: {
        type: String,
        required: [true, 'auth key is required'],
      },
    },
  },
  {
    timestamps: true,
  }
);

PushSubscriptionSchema.index({ user: 1 });

export const PushSubscription = model<IPushSubscription>('PushSubscription', PushSubscriptionSchema);
