import mongoose from 'mongoose';
import { seedDatabase } from './seed';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/timetable-app';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully');
    await seedDatabase();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
