import webpush from 'web-push';
import dotenv from 'dotenv';
import { PushSubscription } from '../models/PushSubscription';

dotenv.config();

// VAPID Keys setup (Read from env or use pre-generated fallback keys)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BCc5yX7B2K8wZ4mQ1vL9xP3oR7sT2uV8wZ4mQ1vL9xP3oR7sT2uV8wZ4mQ1vL9xP3oR7sT2uV8wZ4mQ1vL9xP3o';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v';

webpush.setVapidDetails(
  process.env.VAPID_MAILTO || 'mailto:admin@manage-timetable.com',
  vapidPublicKey,
  vapidPrivateKey
);

export { vapidPublicKey, vapidPrivateKey };

/**
 * Sends Web Push Notification to all active subscriptions of a given user
 */
export const sendWebPushNotificationToUser = async (
  userId: string,
  payload: { title: string; body: string; url?: string; icon?: string }
): Promise<void> => {
  try {
    const subscriptions = await PushSubscription.find({ user: userId });
    if (!subscriptions || subscriptions.length === 0) return;

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/dashboard',
      icon: payload.icon || '/favicon.svg',
    });

    const pushPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          notificationPayload
        );
      } catch (err: any) {
        // If subscription is expired or invalid (404/410), delete it from DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
        } else {
          console.error(`Error sending Web Push to endpoint ${sub.endpoint}:`, err);
        }
      }
    });

    await Promise.all(pushPromises);
  } catch (error) {
    console.error(`Failed to send Web Push to user ${userId}:`, error);
  }
};
