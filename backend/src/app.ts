import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';
import categoryRoutes from './routes/categoryRoutes';
import tagRoutes from './routes/tagRoutes';
import focusSessionRoutes from './routes/focusSessionRoutes';
import { authLimiter, scheduleLimiter } from './middlewares/rateLimiter';
import { globalErrorHandler } from './middlewares/errorHandler';

/**
 * Creates and configures the Express app.
 * Separated from index.ts so it can be imported by supertest in integration tests.
 */
export const createApp = () => {
  const app = express();

  // Middlewares
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Database connectivity check
  app.use('/api', (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      res.status(503).json({
        message: 'Không thể kết nối đến cơ sở dữ liệu MongoDB.',
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
  app.use('/api/tags', tagRoutes);
  app.use('/api/focus-sessions', focusSessionRoutes);

  app.get('/', (req, res) => {
    res.send('Timetable Management API is running...');
  });

  // Global Error Handler
  app.use(globalErrorHandler);

  return app;
};
