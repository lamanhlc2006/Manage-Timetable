import { createSchedule, updateSchedule, deleteSchedule } from './scheduleService';
import { message } from 'antd';

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  scheduleId?: string;
  payload?: any;
  timestamp: number;
}

const QUEUE_KEY = 'offline_actions_queue';

export const getOfflineQueue = (): OfflineAction[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading offline queue', e);
    return [];
  }
};

const saveOfflineQueue = (queue: OfflineAction[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Error saving offline queue', e);
  }
};

export const addOfflineAction = (action: {
  type: 'create' | 'update' | 'delete';
  scheduleId?: string;
  payload?: any;
}) => {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    ...action,
    timestamp: Date.now(),
  };
  queue.push(newAction);
  saveOfflineQueue(queue);

  // Register Background Sync if Service Worker supported
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((swRegistration: any) => {
      swRegistration.sync.register('sync-schedules').catch((err: any) => {
        console.warn('Background sync registration failed:', err);
      });
    });
  }
};

export const syncOfflineQueue = async (): Promise<number> => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let syncedCount = 0;
  const remainingQueue: OfflineAction[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'create' && item.payload) {
        await createSchedule(item.payload);
      } else if (item.type === 'update' && item.scheduleId && item.payload) {
        await updateSchedule(item.scheduleId, item.payload);
      } else if (item.type === 'delete' && item.scheduleId) {
        await deleteSchedule(item.scheduleId);
      }
      syncedCount++;
    } catch (err) {
      console.error(`Failed to sync offline item ${item.id}:`, err);
      remainingQueue.push(item);
    }
  }

  saveOfflineQueue(remainingQueue);

  if (syncedCount > 0) {
    message.success(`Đã tự động đồng bộ ${syncedCount} tác vụ được tạo/sửa khi ngoại tuyến!`);
    window.dispatchEvent(new Event('offline-sync-complete'));
  }

  return syncedCount;
};

// Automatically listen to online event
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncOfflineQueue();
  });
}
