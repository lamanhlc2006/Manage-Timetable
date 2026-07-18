import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  isActive: boolean;
  matchPassword: (enteredPassword: string) => Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRecurrence {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  endDate?: Date;
  exceptions?: Date[];
}

export interface ISchedule extends Document {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  createdBy: Types.ObjectId | IUser;
  recurrence?: IRecurrence;
  isException?: boolean;
  parentEvent?: Types.ObjectId | ISchedule;
  createdAt: Date;
  updatedAt: Date;
}
