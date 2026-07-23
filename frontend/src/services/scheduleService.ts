import api from './api';
import { addOfflineAction } from './offlineSync';

export interface UserRef {
  _id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

export interface RecurrenceSettings {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
  exceptions?: string[];
}

export interface ScheduleEvent {
  _id: string;
  title: string;
  description?: string;
  startTime: string; // ISO Date String
  endTime: string; // ISO Date String
  color: string;
  category?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  createdBy: UserRef;
  recurrence?: RecurrenceSettings;
  isException?: boolean;
  parentEvent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  title: string;
  description?: string;
  startTime: string; // ISO Date String
  endTime: string; // ISO Date String
  color?: string;
  category?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  recurrence?: RecurrenceSettings;
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
        category: 'Công việc',
        priority: 'high',
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
        category: 'Học tập',
        priority: 'medium',
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

export const fetchSchedules = async (params?: { startTime?: string; endTime?: string }): Promise<ScheduleEvent[]> => {
  if (isOffline()) {
    let list = getOfflineSchedules();
    if (params?.startTime) {
      list = list.filter((s) => new Date(s.endTime) >= new Date(params.startTime!));
    }
    if (params?.endTime) {
      list = list.filter((s) => new Date(s.startTime) <= new Date(params.endTime!));
    }
    return list;
  }
  const response = await api.get<ScheduleEvent[]>('/schedules', { params });
  return response.data;
};

export const createSchedule = async (data: CreateScheduleInput & { force?: boolean }): Promise<ScheduleEvent> => {
  if (isOffline() || !navigator.onLine) {
    addOfflineAction({ type: 'create', payload: data });
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

export const updateSchedule = async (
  id: string,
  data: Partial<CreateScheduleInput> & { force?: boolean; recurrenceEditMode?: 'all' | 'current' | 'future'; instanceDate?: string }
): Promise<ScheduleEvent> => {
  if (isOffline() || !navigator.onLine) {
    addOfflineAction({ type: 'update', scheduleId: id, payload: data });
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

export const patchScheduleTime = async (
  id: string,
  data: { startTime: string; endTime: string; force?: boolean; recurrenceEditMode?: 'all' | 'current' | 'future' }
): Promise<ScheduleEvent> => {
  if (isOffline() || !navigator.onLine) {
    addOfflineAction({ type: 'update', scheduleId: id, payload: data });
    const schedules = getOfflineSchedules();
    const index = schedules.findIndex((item) => item._id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy sự kiện');
    }

    const updatedEvent: ScheduleEvent = {
      ...schedules[index],
      startTime: data.startTime,
      endTime: data.endTime,
      updatedAt: new Date().toISOString(),
    };

    schedules[index] = updatedEvent;
    saveOfflineSchedules(schedules);
    return updatedEvent;
  }
  const response = await api.patch<ScheduleEvent>(`/schedules/${id}`, data);
  return response.data;
};

export const deleteSchedule = async (id: string, deleteMode?: 'all' | 'current' | 'future'): Promise<{ message: string; id: string }> => {
  if (isOffline() || !navigator.onLine) {
    addOfflineAction({ type: 'delete', scheduleId: id });
    const schedules = getOfflineSchedules();
    const filtered = schedules.filter(item => item._id !== id);
    saveOfflineSchedules(filtered);
    return { message: 'Xóa thành công', id };
  }
  const query = deleteMode ? `?deleteMode=${deleteMode}` : '';
  const response = await api.delete<{ message: string; id: string }>(`/schedules/${id}${query}`);
  return response.data;
};

export const searchSchedules = async (params: {
  keyword?: string;
  categories?: string[];
  priority?: string[];
  startTime?: string;
  endTime?: string;
  creator?: string;
}): Promise<ScheduleEvent[]> => {
  if (isOffline()) {
    let data = getOfflineSchedules();
    if (params.keyword) {
      const kw = params.keyword.toLowerCase();
      data = data.filter(
        (item) =>
          item.title.toLowerCase().includes(kw) ||
          (item.description && item.description.toLowerCase().includes(kw))
      );
    }
    if (params.categories && params.categories.length > 0) {
      data = data.filter((item) => item.category && params.categories!.includes(item.category));
    }
    if (params.priority && params.priority.length > 0) {
      data = data.filter((item) => item.priority && params.priority!.includes(item.priority));
    }
    if (params.creator) {
      data = data.filter((item) => item.createdBy?._id === params.creator);
    }
    if (params.startTime) {
      const start = new Date(params.startTime).getTime();
      data = data.filter((item) => new Date(item.startTime).getTime() >= start);
    }
    if (params.endTime) {
      const end = new Date(params.endTime).getTime();
      data = data.filter((item) => new Date(item.startTime).getTime() <= end);
    }
    return data;
  }

  const queryParams = new URLSearchParams();
  if (params.keyword) queryParams.append('keyword', params.keyword);
  if (params.categories && params.categories.length > 0) {
    queryParams.append('categories', params.categories.join(','));
  }
  if (params.priority && params.priority.length > 0) {
    queryParams.append('priority', params.priority.join(','));
  }
  if (params.startTime) queryParams.append('startTime', params.startTime);
  if (params.endTime) queryParams.append('endTime', params.endTime);
  if (params.creator) queryParams.append('creator', params.creator);

  const response = await api.get<ScheduleEvent[]>(`/schedules/search?${queryParams.toString()}`);
  return response.data;
};
