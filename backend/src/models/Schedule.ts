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
      validate: {
        validator: function (this: ISchedule, value: Date) {
          // Check that endTime is strictly after startTime
          return this.startTime < value;
        },
        message: 'End time must be after start time',
      },
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
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
ScheduleSchema.index({ category: 1 });
ScheduleSchema.index({ priority: 1 });
ScheduleSchema.index({ startTime: 1, endTime: 1 });
ScheduleSchema.index({ title: 'text', description: 'text' });

export const Schedule = model<ISchedule>('Schedule', ScheduleSchema);
