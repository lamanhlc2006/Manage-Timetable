import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  matchPassword: (enteredPassword: string) => Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISchedule extends Document {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  color: string;
  createdBy: Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
}
