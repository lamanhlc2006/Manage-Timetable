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

const isOffline = (): boolean => {
  return localStorage.getItem('offlineMode') === 'true';
};

const getOfflineSchedules = (): ScheduleEvent[] => {
  const data = localStorage.getItem('schedules_data');
  if (!data) {
    const defaultSchedules: ScheduleEvent[] = [
      {
        _id: 'offline-event-1',
        title: 'Họp giao ban đầu tuần',
        description: 'Thảo luận kế hoạch phát triển dự án và phân công công việc.',
        startTime: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
        endTime: new Date(new Date().setHours(11, 0, 0, 0)).toISOString(),
        color: '#1890ff',
        createdBy: {
          _id: 'mock-admin-id-123',
          username: 'Demo Admin',
          email: 'admin@example.com',
          role: 'admin',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'offline-event-2',
        title: 'Review thiết kế UI/UX',
        description: 'Xem xét các thiết kế mới cho phân hệ Quản lý Thời gian biểu.',
        startTime: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
        endTime: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(),
        color: '#52c41a',
        createdBy: {
          _id: 'mock-admin-id-123',
          username: 'Demo Admin',
          email: 'admin@example.com',
          role: 'admin',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    defaultSchedules[1].startTime = new Date(new Date(defaultSchedules[1].startTime).setHours(14, 0, 0, 0)).toISOString();
    defaultSchedules[1].endTime = new Date(new Date(defaultSchedules[1].endTime).setHours(16, 0, 0, 0)).toISOString();

    localStorage.setItem('schedules_data', JSON.stringify(defaultSchedules));
    return defaultSchedules;
  }
  return JSON.parse(data);
};

const saveOfflineSchedules = (schedules: ScheduleEvent[]) => {
  localStorage.setItem('schedules_data', JSON.stringify(schedules));
};

export const fetchSchedules = async (): Promise<ScheduleEvent[]> => {
  if (isOffline()) {
    return getOfflineSchedules();
  }
  const response = await api.get<ScheduleEvent[]>('/schedules');
  return response.data;
};

export const createSchedule = async (data: CreateScheduleInput): Promise<ScheduleEvent> => {
  if (isOffline()) {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : { _id: 'mock-user', username: 'Guest', email: 'guest@example.com', role: 'user' };
    
    const newEvent: ScheduleEvent = {
      _id: `offline-event-${Date.now()}`,
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      color: data.color || '#1890ff',
      createdBy: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const schedules = getOfflineSchedules();
    schedules.push(newEvent);
    saveOfflineSchedules(schedules);
    return newEvent;
  }
  const response = await api.post<ScheduleEvent>('/schedules', data);
  return response.data;
};

export const updateSchedule = async (id: string, data: Partial<CreateScheduleInput>): Promise<ScheduleEvent> => {
  if (isOffline()) {
    const schedules = getOfflineSchedules();
    const index = schedules.findIndex(item => item._id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy sự kiện');
    }
    
    const updatedEvent: ScheduleEvent = {
      ...schedules[index],
      ...data,
      updatedAt: new Date().toISOString(),
    } as ScheduleEvent;
    
    schedules[index] = updatedEvent;
    saveOfflineSchedules(schedules);
    return updatedEvent;
  }
  const response = await api.put<ScheduleEvent>(`/schedules/${id}`, data);
  return response.data;
};

export const deleteSchedule = async (id: string): Promise<{ message: string; id: string }> => {
  if (isOffline()) {
    const schedules = getOfflineSchedules();
    const filtered = schedules.filter(item => item._id !== id);
    saveOfflineSchedules(filtered);
    return { message: 'Xóa thành công', id };
  }
  const response = await api.delete<{ message: string; id: string }>(`/schedules/${id}`);
  return response.data;
};
