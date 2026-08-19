import { Schema, model, Types } from 'mongoose';
import { ISchedule } from '../types';

const ScheduleSchema = new Schema<ISchedule>(
  {
    title: {
      type: String,
      required: [true, 'Please provide a schedule title'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startTime: {
      type: Date,
      required: [true, 'Please provide a start time'],
    },
    endTime: {
      type: Date,
      required: [true, 'Please provide an end time'],
    },
    color: {
      type: String,
      default: '#1890ff', // Antd default blue color hex
    },
    category: {
      type: String,
      trim: true,
      default: 'Học tập',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Schedule must belong to a user'],
    },
    recurrence: {
      type: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly', 'custom'],
        default: 'none',
      },
      interval: {
        type: Number,
        default: 1,
      },
      daysOfWeek: [Number],
      endDate: Date,
      exceptions: [Date],
    },
    isException: {
      type: Boolean,
      default: false,
    },
    parentEvent: {
      type: Schema.Types.ObjectId,
      ref: 'Schedule',
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    reminderMinutes: {
      type: Number,
      default: null,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    googleEventId: {
      type: String,
      default: null,
    },
    syncedWithGoogle: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Validate endTime > startTime (works with both save() and findByIdAndUpdate)
ScheduleSchema.pre('validate', function (next) {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    this.invalidate('endTime', 'End time must be after start time');
  }
  next();
});

// Indexes for performance optimization
ScheduleSchema.index({ category: 1 });
ScheduleSchema.index({ tags: 1 });
ScheduleSchema.index({ priority: 1 });
ScheduleSchema.index({ startTime: 1, endTime: 1 });
ScheduleSchema.index({ title: 'text', description: 'text' });

export const Schedule = model<ISchedule>('Schedule', ScheduleSchema);
