import { Schema, model, Document, Types } from 'mongoose';

export interface IGroupMember {
  user: Types.ObjectId;
  role: 'viewer' | 'editor';
  joinedAt: Date;
}

export interface IGroup extends Document {
  name: string;
  description?: string;
  color: string;
  owner: Types.ObjectId;
  members: IGroupMember[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    color: {
      type: String,
      default: '#1890ff',
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

GroupSchema.index({ owner: 1 });
GroupSchema.index({ 'members.user': 1 });

export const Group = model<IGroup>('Group', GroupSchema);
