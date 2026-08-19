import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  const rawOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'];

  // Filter out wildcard '*' — not allowed with credentials: true (CORS spec violation)
  const allowedOrigins = rawOrigins.filter(o => o.trim() !== '*');

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
  });

  // Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1] ||
        (socket.handshake.query?.token as string);

      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      if (!process.env.JWT_SECRET) {
        return next(new Error('Authentication error: JWT_SECRET is not configured'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      ) as { id: string };

      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    if (userId) {
      const roomName = `user_${userId}`;
      socket.join(roomName);
    }

    socket.on('disconnect', () => {
      // Clean up connection
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO is not initialized!');
  }
  return io;
};

export const emitScheduleCreated = (userId: string, schedule: any) => {
  if (io) {
    io.to(`user_${userId}`).emit('schedule:created', schedule);
    io.to('admin_room').emit('schedule:created', schedule);
  }
};

export const emitScheduleUpdated = (userId: string, schedule: any) => {
  if (io) {
    io.to(`user_${userId}`).emit('schedule:updated', schedule);
    io.to('admin_room').emit('schedule:updated', schedule);
  }
};

export const emitScheduleDeleted = (userId: string, scheduleId: string) => {
  if (io) {
    io.to(`user_${userId}`).emit('schedule:deleted', { id: scheduleId });
    io.to('admin_room').emit('schedule:deleted', { id: scheduleId });
  }
};

export const emitNotificationNew = (userId: string, notification: any) => {
  if (io) {
    io.to(`user_${userId}`).emit('notification:new', notification);
  }
};
