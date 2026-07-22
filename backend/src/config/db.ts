import mongoose from 'mongoose';
import { seedDatabase } from './seed';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/timetable-app';
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected successfully');
    await seedDatabase();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.warn('⚠️ Cảnh báo: Không thể kết nối tới MongoDB. Vui lòng kiểm tra dịch vụ MongoDB trên máy của bạn (ví dụ: mongod service hoặc Docker container).');
  }
};
