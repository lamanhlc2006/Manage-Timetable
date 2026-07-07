import api from './api';

export interface UserRef {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

export interface ScheduleEvent {
  _id: string;
  title: string;
  description?: string;
  startTime: string; // ISO Date String
  endTime: string; // ISO Date String
  color: string;
  createdBy: UserRef;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  title: string;
  description?: string;
  startTime: string; // ISO Date String
  endTime: string; // ISO Date String
  color?: string;
}

export const fetchSchedules = async (): Promise<ScheduleEvent[]> => {
  const response = await api.get<ScheduleEvent[]>('/schedules');
  return response.data;
};

export const createSchedule = async (data: CreateScheduleInput): Promise<ScheduleEvent> => {
  const response = await api.post<ScheduleEvent>('/schedules', data);
  return response.data;
};

export const updateSchedule = async (id: string, data: Partial<CreateScheduleInput>): Promise<ScheduleEvent> => {
  const response = await api.put<ScheduleEvent>(`/schedules/${id}`, data);
  return response.data;
};

export const deleteSchedule = async (id: string): Promise<{ message: string; id: string }> => {
  const response = await api.delete<{ message: string; id: string }>(`/schedules/${id}`);
  return response.data;
};
