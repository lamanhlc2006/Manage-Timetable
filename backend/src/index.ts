import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import categoryRoutes from './routes/categoryRoutes';
import focusSessionRoutes from './routes/focusSessionRoutes';
import { authLimiter, scheduleLimiter } from './middlewares/rateLimiter';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to Database
connectDB();

import mongoose from 'mongoose';

// Middlewares
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json()); // Body parser for JSON payloads
app.use(cookieParser());

// Middleware to verify database connectivity for API routes
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      message: 'Không thể kết nối đến cơ sở dữ liệu MongoDB. Vui lòng đảm bảo dịch vụ MongoDB (mongod) đang hoạt động trên máy chủ.',
    });
    return;
  }
  next();
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/schedules', scheduleLimiter, scheduleRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/focus-sessions', focusSessionRoutes);

// Root route for simple API check
app.get('/', (req, res) => {
  res.send('Timetable Management API is running...');
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
