import { Response } from 'express';
import { Notification } from '../models/Notification';
import { PushSubscription } from '../models/PushSubscription';
import { vapidPublicKey } from '../config/webPushConfig';
import { AuthRequest } from '../middlewares/authMiddleware';
import { handleControllerError, isValidObjectId } from '../utils/errorHandler';

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('relatedSchedule', 'title startTime endTime category priority')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error: any) {
    handleControllerError(res, error, 'Get notifications error');
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Định dạng ID thông báo không hợp lệ' });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ message: 'Không tìm thấy thông báo' });
      return;
    }

    res.json(notification);
  } catch (error: any) {
    handleControllerError(res, error, 'Mark notification read error');
  }
};

/**
 * @desc    Mark all user notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (error: any) {
    handleControllerError(res, error, 'Mark all notifications read error');
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      res.status(400).json({ message: 'Định dạng ID thông báo không hợp lệ' });
      return;
    }

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: req.user._id,
    });

    if (!notification) {
      res.status(404).json({ message: 'Không tìm thấy thông báo' });
      return;
    }

    res.json({ message: 'Xóa thông báo thành công', id });
  } catch (error: any) {
    handleControllerError(res, error, 'Delete notification error');
  }
};

/**
 * @desc    Get VAPID Public Key for Web Push subscription
 * @route   GET /api/notifications/vapid-public-key
 * @access  Public / Private
 */
export const getVapidPublicKey = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json({ publicKey: vapidPublicKey });
};

/**
 * @desc    Subscribe user to Web Push notifications
 * @route   POST /api/notifications/subscribe
 * @access  Private
 */
export const subscribeWebPush = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const { endpoint, keys } = req.body;
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      res.status(400).json({ message: 'Invalid subscription object' });
      return;
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { user: req.user._id, endpoint, keys },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: 'Đăng ký Web Push thành công' });
  } catch (error: any) {
    handleControllerError(res, error, 'Subscribe Web Push error');
  }
};

/**
 * @desc    Unsubscribe user from Web Push notifications
 * @route   POST /api/notifications/unsubscribe
 * @access  Private
 */
export const unsubscribeWebPush = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ message: 'Endpoint is required' });
      return;
    }

    await PushSubscription.deleteOne({ endpoint, user: req.user._id });
    res.json({ message: 'Hủy đăng ký Web Push thành công' });
  } catch (error: any) {
    handleControllerError(res, error, 'Unsubscribe Web Push error');
  }
};
