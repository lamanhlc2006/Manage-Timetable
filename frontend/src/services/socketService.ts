/// <reference types="vite/client" />
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const connectSocket = (): Socket | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socket && socket.connected) {
    return socket;
  }

  const backendUrl = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace('/api', '')
    : 'http://localhost:5000';

  socket = io(backendUrl, {
    auth: {
      token,
    },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const subscribeToScheduleEvents = (callbacks: {
  onCreated?: (schedule: any) => void;
  onUpdated?: (schedule: any) => void;
  onDeleted?: (data: { id: string }) => void;
  onNotificationNew?: (notification: any) => void;
}) => {
  const s = connectSocket();
  if (!s) return () => {};

  if (callbacks.onCreated) s.on('schedule:created', callbacks.onCreated);
  if (callbacks.onUpdated) s.on('schedule:updated', callbacks.onUpdated);
  if (callbacks.onDeleted) s.on('schedule:deleted', callbacks.onDeleted);
  if (callbacks.onNotificationNew) s.on('notification:new', callbacks.onNotificationNew);

  return () => {
    if (callbacks.onCreated) s.off('schedule:created', callbacks.onCreated);
    if (callbacks.onUpdated) s.off('schedule:updated', callbacks.onUpdated);
    if (callbacks.onDeleted) s.off('schedule:deleted', callbacks.onDeleted);
    if (callbacks.onNotificationNew) s.off('notification:new', callbacks.onNotificationNew);
  };
};
