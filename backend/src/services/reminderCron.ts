import cron from 'node-cron';
import { Schedule } from '../models/Schedule';
import { Notification } from '../models/Notification';
import { sendWebPushNotificationToUser } from '../config/webPushConfig';
import { emitNotificationNew } from '../config/socket';
import { expandRecurringEvents } from '../config/recurrenceHelper';

export const startReminderCron = () => {
  // Run every minute: '* * * * *'
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const lookahead = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours lookahead

      // 1. Fetch static schedules with reminderMinutes set and not sent yet
      const staticSchedules = await Schedule.find({
        reminderMinutes: { $ne: null, $gt: 0 },
        reminderSent: { $ne: true },
        $or: [{ 'recurrence.type': { $exists: false } }, { 'recurrence.type': 'none' }],
      }).populate('createdBy', '_id username email');

      for (const schedule of staticSchedules) {
        if (!schedule.reminderMinutes) continue;
        const startTime = new Date(schedule.startTime);
        const reminderTime = new Date(startTime.getTime() - schedule.reminderMinutes * 60 * 1000);

        if (now >= reminderTime && now <= startTime) {
          const userId = (schedule.createdBy as any)?._id?.toString() || schedule.createdBy.toString();

          const formatTime = startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const notifTitle = `⏰ Nhắc nhở sự kiện: ${schedule.title}`;
          const notifMessage = `Sự kiện "${schedule.title}" sẽ diễn ra lúc ${formatTime} (trong ${schedule.reminderMinutes} phút nữa).`;

          // Create Notification in DB
          const newNotif = await Notification.create({
            recipient: userId,
            type: 'reminder',
            title: notifTitle,
            message: notifMessage,
            relatedSchedule: schedule._id,
            isRead: false,
          });

          // Send Web Push Notification
          await sendWebPushNotificationToUser(userId, {
            title: notifTitle,
            body: notifMessage,
            url: '/dashboard',
          });

          // Emit Socket.IO event
          emitNotificationNew(userId, newNotif);

          // Update Schedule reminderSent flag
          schedule.reminderSent = true;
          await schedule.save();
        }
      }

      // 2. Fetch recurring schedules with reminderMinutes set
      const recurringSchedules = await Schedule.find({
        reminderMinutes: { $ne: null, $gt: 0 },
        'recurrence.type': { $exists: true, $ne: 'none' },
      }).populate('createdBy', '_id username email');

      if (recurringSchedules.length > 0) {
        const expandedInstances = expandRecurringEvents(recurringSchedules, now, lookahead);

        for (const instance of expandedInstances) {
          if (!instance.reminderMinutes) continue;
          const startTime = new Date(instance.startTime);
          const reminderTime = new Date(startTime.getTime() - instance.reminderMinutes * 60 * 1000);

          if (now >= reminderTime && now <= startTime) {
            const parentId = instance.parentEvent || instance._id;
            const userId = (instance.createdBy as any)?._id?.toString() || instance.createdBy.toString();

            // Check if notification already created for this specific instance time
            const existingNotif = await Notification.findOne({
              recipient: userId,
              type: 'reminder',
              relatedSchedule: parentId,
              createdAt: { $gte: new Date(now.getTime() - 30 * 60 * 1000) },
            });

            if (!existingNotif) {
              const formatTime = startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const notifTitle = `⏰ Nhắc nhở sự kiện: ${instance.title}`;
              const notifMessage = `Sự kiện "${instance.title}" sẽ diễn ra lúc ${formatTime} (trong ${instance.reminderMinutes} phút nữa).`;

              const newNotif = await Notification.create({
                recipient: userId,
                type: 'reminder',
                title: notifTitle,
                message: notifMessage,
                relatedSchedule: parentId,
                isRead: false,
              });

              await sendWebPushNotificationToUser(userId, {
                title: notifTitle,
                body: notifMessage,
                url: '/dashboard',
              });

              emitNotificationNew(userId, newNotif);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error running reminder cron job:', error);
    }
  });
};
