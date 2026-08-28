import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock api module
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  NotificationItem,
} from '../services/notificationService';

const mockNotification: NotificationItem = {
  _id: 'notif-1',
  recipient: 'user-1',
  type: 'reminder',
  title: 'Test Notification',
  message: 'Test message',
  isRead: false,
  createdAt: '2026-08-28T00:00:00Z',
  updatedAt: '2026-08-28T00:00:00Z',
};

describe('notificationService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('fetchNotifications (offline mode)', () => {
    it('should return empty array when no offline data', async () => {
      localStorageMock.setItem('offlineMode', 'true');
      const result = await fetchNotifications();
      expect(result).toEqual([]);
    });

    it('should return saved notifications in offline mode', async () => {
      localStorageMock.setItem('offlineMode', 'true');
      localStorageMock.setItem('notifications_data', JSON.stringify([mockNotification]));
      const result = await fetchNotifications();
      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe('notif-1');
    });
  });

  describe('markNotificationAsRead (offline mode)', () => {
    it('should mark notification as read offline', async () => {
      localStorageMock.setItem('offlineMode', 'true');
      localStorageMock.setItem('notifications_data', JSON.stringify([mockNotification]));

      const result = await markNotificationAsRead('notif-1');
      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
    });

    it('should throw when notification not found offline', async () => {
      localStorageMock.setItem('offlineMode', 'true');
      localStorageMock.setItem('notifications_data', JSON.stringify([]));

      await expect(markNotificationAsRead('non-existent')).rejects.toThrow('Notification not found');
    });
  });

  describe('markAllNotificationsAsRead (offline mode)', () => {
    it('should mark all notifications as read offline', async () => {
      localStorageMock.setItem('offlineMode', 'true');
      const notifs = [
        { ...mockNotification, _id: 'n1' },
        { ...mockNotification, _id: 'n2' },
      ];
      localStorageMock.setItem('notifications_data', JSON.stringify(notifs));

      await markAllNotificationsAsRead();

      const saved = JSON.parse(localStorageMock.getItem('notifications_data')!);
      expect(saved).toHaveLength(2);
      expect(saved[0].isRead).toBe(true);
      expect(saved[1].isRead).toBe(true);
    });
  });

  describe('deleteNotification (offline mode)', () => {
    it('should remove notification from offline storage', async () => {
      localStorageMock.setItem('offlineMode', 'true');
      const notifs = [
        { ...mockNotification, _id: 'n1' },
        { ...mockNotification, _id: 'n2' },
      ];
      localStorageMock.setItem('notifications_data', JSON.stringify(notifs));

      await deleteNotification('n1');

      const saved = JSON.parse(localStorageMock.getItem('notifications_data')!);
      expect(saved).toHaveLength(1);
      expect(saved[0]._id).toBe('n2');
    });
  });
});
