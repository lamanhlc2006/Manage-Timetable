import dotenv from 'dotenv';
import http from 'http';

// Load environment variables immediately
dotenv.config();

import { connectDB } from './config/db';
import { createApp } from './app';
import { initSocket } from './config/socket';
import { startReminderCron } from './services/reminderCron';

// Connect to Database
connectDB();

// Create Express app
const app = createApp();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start Reminder Background Cron Job
startReminderCron();

// Port configuration
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
