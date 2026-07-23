import mongoose, { Schema, Document } from 'mongoose';

export interface IFocusSession extends Document {
  userId: mongoose.Types.ObjectId;
  scheduleId?: mongoose.Types.ObjectId;
  title: string;
  category: string;
  durationMinutes: number;
  completedAt: Date;
  sessionType: 'focus' | 'shortBreak' | 'longBreak';
  createdAt: Date;
  updatedAt: Date;
}

const FocusSessionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scheduleId: {
      type: Schema.Types.ObjectId,
      ref: 'Schedule',
      required: false,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: 'Focus Session',
    },
    category: {
      type: String,
      default: 'Khác',
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 1,
    },
    completedAt: {
      type: Date,
      default: Date.now,
    },
    sessionType: {
      type: String,
      enum: ['focus', 'shortBreak', 'longBreak'],
      default: 'focus',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IFocusSession>('FocusSession', FocusSessionSchema);
