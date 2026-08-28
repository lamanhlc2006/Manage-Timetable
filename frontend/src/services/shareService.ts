import api from './api';

export interface ShareLinkItem {
  _id: string;
  token: string;
  permission: string;
  expiresAt?: string;
  hasPassword?: boolean;
  label?: string;
  isActive: boolean;
  accessCount: number;
  createdAt: string;
}

export interface CreateShareLinkInput {
  expiresIn?: number; // hours
  password?: string;
  label?: string;
}

export interface SharedEvent {
  _id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  color: string;
  category: string;
  tags: string[];
  priority: string;
  status: string;
  isAllDay: boolean;
}

export interface SharedCalendarData {
  events: SharedEvent[];
  permission: string;
  label?: string;
}

export const createShareLink = async (data: CreateShareLinkInput): Promise<ShareLinkItem> => {
  const response = await api.post<ShareLinkItem>('/share/create', data);
  return response.data;
};

export const getMyShareLinks = async (): Promise<ShareLinkItem[]> => {
  const response = await api.get<ShareLinkItem[]>('/share/my-links/list');
  return response.data;
};

export const deleteShareLink = async (id: string): Promise<void> => {
  await api.delete(`/share/${id}`);
};

export const getSharedCalendar = async (token: string, password?: string): Promise<SharedCalendarData> => {
  const params = password ? { password } : {};
  const response = await api.get<SharedCalendarData>(`/share/${token}`, { params });
  return response.data;
};
