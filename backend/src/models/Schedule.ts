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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Schedule must belong to a user'],
    },
  },
  {
    timestamps: true,
  }
);

export const Schedule = model<ISchedule>('Schedule', ScheduleSchema);
