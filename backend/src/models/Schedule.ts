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
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
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
      count: {
        type: Number,
        min: [1, 'Recurrence count must be at least 1'],
      },
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
    isAllDay: {
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

// Validate endTime > startTime (skip for all-day events where times are normalized)
ScheduleSchema.pre('validate', function (next) {
  if (!this.isAllDay && this.startTime && this.endTime && this.startTime >= this.endTime) {
    this.invalidate('endTime', 'End time must be after start time');
  }
  next();
});

// Normalize all-day event times: startTime → 00:00:00, endTime → 23:59:59
ScheduleSchema.pre('save', function (next) {
  if (this.isAllDay && this.startTime && this.endTime) {
    const start = new Date(this.startTime);
    start.setHours(0, 0, 0, 0);
    this.startTime = start;

    const end = new Date(this.endTime);
    end.setHours(23, 59, 59, 999);
    this.endTime = end;
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
