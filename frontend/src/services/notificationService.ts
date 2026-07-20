import api from './api';

export interface NotificationItem {
  _id: string;
  recipient: string;
  type: 'reminder' | 'system' | 'update';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

const isOffline = (): boolean => {
  return localStorage.getItem('offlineMode') === 'true';
};

const getOfflineNotifications = (): NotificationItem[] => {
  const data = localStorage.getItem('notifications_data');
  if (!data) return [];
  return JSON.parse(data);
};

const saveOfflineNotifications = (items: NotificationItem[]) => {
  localStorage.setItem('notifications_data', JSON.stringify(items));
};

export const fetchNotifications = async (): Promise<NotificationItem[]> => {
  if (isOffline()) {
    return getOfflineNotifications();
  }

  const response = await api.get<NotificationItem[]>('/notifications');
  return response.data;
};

export const markNotificationAsRead = async (id: string): Promise<NotificationItem> => {
  if (isOffline()) {
    const list = getOfflineNotifications();
    const idx = list.findIndex((item) => item._id === id);
    if (idx !== -1) {
      list[idx].isRead = true;
      list[idx].updatedAt = new Date().toISOString();
      saveOfflineNotifications(list);
      return list[idx];
    }
    throw new Error('Notification not found');
  }

  const response = await api.patch<NotificationItem>(`/notifications/${id}/read`);
  return response.data;
};
