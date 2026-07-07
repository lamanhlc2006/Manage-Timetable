import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import scheduleRoutes from './routes/scheduleRoutes';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Connect to Database
connectDB();

// Middlewares
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Body parser for JSON payloads

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);

// Root route for simple API check
app.get('/', (req, res) => {
  res.send('Timetable Management API is running...');
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
