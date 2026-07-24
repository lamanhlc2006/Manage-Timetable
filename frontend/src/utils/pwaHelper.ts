import { syncOfflineQueue } from '../services/offlineSync';
import api from '../services/api';

export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('PWA ServiceWorker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('PWA ServiceWorker registration failed:', error);
        });
    });

    // Listen to messages from ServiceWorker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'TRIGGER_OFFLINE_SYNC') {
        syncOfflineQueue();
      }
    });
  }
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('Trình duyệt không hỗ trợ Web Push Notification');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  return permission;
};

export const sendLocalNotification = (title: string, options?: NotificationOptions) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          ...options,
        });
      });
    } else {
      new Notification(title, {
        icon: '/favicon.svg',
        ...options,
      });
    }
  }
};

// Converts Base64 URL safe string to Uint8Array for VAPID applicationServerKey
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Subscribes current browser instance to Backend Web Push Notification
 */
export const subscribeUserToWebPush = async (): Promise<boolean> => {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return false;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported in this browser.');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;

    // Fetch VAPID Public Key from Backend
    const response = await api.get('/notifications/vapid-public-key');
    const publicKey = response.data.publicKey;
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe browser via PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as unknown as BufferSource,
    });

    // Send subscription object to backend DB
    await api.post('/notifications/subscribe', subscription.toJSON());
    return true;
  } catch (error) {
    console.error('Failed to subscribe user to Web Push:', error);
    return false;
  }
};

/**
 * Unsubscribes current browser instance from Web Push Notification
 */
export const unsubscribeUserFromWebPush = async (): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await api.post('/notifications/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    return true;
  } catch (error) {
    console.error('Failed to unsubscribe user from Web Push:', error);
    return false;
  }
};
