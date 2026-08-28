import { Schema, model, Document, Types } from 'mongoose';

export interface ITemplateEvent {
  title: string;
  description?: string;
  dayOffset: number; // 0 = start day, 1 = next day, etc.
  startHour: number; // 0-23
  startMinute: number; // 0-59
  endHour: number;
  endMinute: number;
  color?: string;
  category?: string;
}

export interface ITemplate extends Document {
  name: string;
  description?: string;
  icon: string;
  category: string;
  events: ITemplateEvent[];
  isSystem: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateEventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    dayOffset: { type: Number, required: true, default: 0 },
    startHour: { type: Number, required: true, min: 0, max: 23 },
    startMinute: { type: Number, required: true, min: 0, max: 59, default: 0 },
    endHour: { type: Number, required: true, min: 0, max: 23 },
    endMinute: { type: Number, required: true, min: 0, max: 59, default: 0 },
    color: { type: String, default: '#1890ff' },
    category: { type: String },
  },
  { _id: false }
);

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    icon: { type: String, default: '📋' },
    category: { type: String, default: 'general' },
    events: [TemplateEventSchema],
    isSystem: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Template = model<ITemplate>('Template', TemplateSchema);
