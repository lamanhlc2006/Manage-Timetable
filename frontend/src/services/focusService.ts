import api from './api';

export interface FocusSession {
  _id?: string;
  scheduleId?: string;
  title: string;
  category?: string;
  durationMinutes: number;
  completedAt?: string;
  sessionType: 'focus' | 'shortBreak' | 'longBreak';
}

export interface FocusStats {
  totalSessions: number;
  totalFocusMinutes: number;
  totalFocusHours: number;
  categoryBreakdown: {
    category: string;
    minutes: number;
    hours: number;
  }[];
  dailyBreakdown: {
    date: string;
    minutes: number;
    hours: number;
  }[];
}

// Log completed focus session
export const logFocusSession = async (payload: {
  scheduleId?: string;
  title?: string;
  category?: string;
  durationMinutes: number;
  sessionType?: 'focus' | 'shortBreak' | 'longBreak';
}): Promise<FocusSession> => {
  const response = await api.post('/focus-sessions', payload);
  return response.data.data;
};

// Fetch focus sessions history
export const fetchFocusSessions = async (params?: {
  startTime?: string;
  endTime?: string;
  sessionType?: string;
}): Promise<FocusSession[]> => {
  const response = await api.get('/focus-sessions', { params });
  return response.data;
};

// Fetch focus statistics
export const fetchFocusStats = async (params?: {
  startTime?: string;
  endTime?: string;
}): Promise<FocusStats> => {
  const response = await api.get('/focus-sessions/stats', { params });
  return response.data;
};
