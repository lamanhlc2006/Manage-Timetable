import cron from 'node-cron';
import { Schedule } from '../models/Schedule';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { sendWebPushNotificationToUser } from '../config/webPushConfig';
import { emitNotificationNew } from '../config/socket';
import { expandRecurringEvents } from '../config/recurrenceHelper';
import { sendReminderEmail } from './emailService';

/**
 * Formats remaining minutes into a human-readable Vietnamese string.
 * Examples: "5 phút", "30 phút", "1 giờ", "2 giờ 15 phút", "1 ngày"
 */
const formatRemainingTime = (minutes: number): string => {
  if (minutes < 1) return 'vài giây';
  if (minutes < 60) return `${Math.round(minutes)} phút`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hours} giờ`;
    return `${hours} giờ ${mins} phút`;
  }
  const days = Math.floor(minutes / 1440);
  const remainingHours = Math.floor((minutes % 1440) / 60);
  if (remainingHours === 0) return `${days} ngày`;
  return `${days} ngày ${remainingHours} giờ`;
};

/**
 * Formats a Date into "HH:mm ngày DD/MM/YYYY" in Vietnamese locale.
 */
const formatEventTime = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())} ngày ${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

export const startReminderCron = () => {
  let isRunning = false;

  // Run every minute: '* * * * *'
  cron.schedule('* * * * *', async () => {
    if (isRunning) {
      console.warn('⚠️ Reminder cron: previous run still in progress, skipping this tick');
      return;
    }
    isRunning = true;
    try {
      const now = new Date();
      // Max lookahead = 24 hours (covers reminderMinutes up to 1440 = 1 day)
      const lookahead = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // 1. Fetch static (non-recurring) schedules with reminder set, not yet sent,
      //    and starting within the next 24 hours
      const staticSchedules = await Schedule.find({
        reminderMinutes: { $ne: null, $gt: 0 },
        reminderSent: { $ne: true },
        startTime: { $gte: now, $lte: lookahead },
        $or: [{ 'recurrence.type': { $exists: false } }, { 'recurrence.type': 'none' }],
      }).populate('createdBy', '_id username email');

      for (const schedule of staticSchedules) {
        if (!schedule.reminderMinutes) continue;
        const startTime = new Date(schedule.startTime);
        const reminderTime = new Date(startTime.getTime() - schedule.reminderMinutes * 60 * 1000);

        if (now >= reminderTime && now <= startTime) {
          const userId = (schedule.createdBy as any)?._id?.toString() || schedule.createdBy.toString();

          // Calculate actual remaining time
          const actualRemainingMinutes = Math.max(1, Math.round((startTime.getTime() - now.getTime()) / 60000));
          const remainingText = formatRemainingTime(actualRemainingMinutes);
          const eventTimeText = formatEventTime(startTime);

          const notifTitle = `⏰ Nhắc nhở sự kiện: ${schedule.title}`;
          const notifMessage = `Sự kiện "${schedule.title}" sẽ diễn ra lúc ${eventTimeText} (còn ${remainingText}).`;

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

          // Send email notification if enabled
          try {
            const user = await User.findById(userId).select('emailNotifications notificationEmail email');
            if (user && (user as any).emailNotifications) {
              const emailTo = (user as any).notificationEmail || user.email;
              if (emailTo) {
                await sendReminderEmail(emailTo, schedule.title, eventTimeText, remainingText);
              }
            }
          } catch (emailErr) {
            console.error('📧 Error checking/sending email notification:', emailErr);
          }

          // Update Schedule reminderSent flag
          schedule.reminderSent = true;
          await schedule.save();
        }
      }

      // 2. Fetch recurring schedules with reminderMinutes set
      const recurringSchedules = await Schedule.find({
        reminderMinutes: { $ne: null, $gt: 0 },
        'recurrence.type': { $exists: true, $ne: 'none' },
        startTime: { $lt: lookahead },
        $or: [
          { 'recurrence.endDate': { $exists: false } },
          { 'recurrence.endDate': null },
          { 'recurrence.endDate': { $gte: now } },
        ],
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

            // Dedup: use instance startTime in message search to distinguish
            // different occurrences of the same recurring event
            const instanceDateStr = startTime.toISOString().split('T')[0];
            const existingNotif = await Notification.findOne({
              recipient: userId,
              type: 'reminder',
              relatedSchedule: parentId,
              message: { $regex: instanceDateStr },
              createdAt: { $gte: new Date(now.getTime() - 30 * 60 * 1000) },
            });

            if (!existingNotif) {
              const actualRemainingMinutes = Math.max(1, Math.round((startTime.getTime() - now.getTime()) / 60000));
              const remainingText = formatRemainingTime(actualRemainingMinutes);
              const eventTimeText = formatEventTime(startTime);

              const notifTitle = `⏰ Nhắc nhở sự kiện: ${instance.title}`;
              const notifMessage = `Sự kiện "${instance.title}" sẽ diễn ra lúc ${eventTimeText} (còn ${remainingText}).`;

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

              // Send email notification if enabled
              try {
                const user = await User.findById(userId).select('emailNotifications notificationEmail email');
                if (user && (user as any).emailNotifications) {
                  const emailTo = (user as any).notificationEmail || user.email;
                  if (emailTo) {
                    await sendReminderEmail(emailTo, instance.title, eventTimeText, remainingText);
                  }
                }
              } catch (emailErr) {
                console.error('📧 Error checking/sending email notification (recurring):', emailErr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error running reminder cron job:', error);
    } finally {
      isRunning = false;
    }
  });
};

