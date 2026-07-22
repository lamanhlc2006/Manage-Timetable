import { Response } from 'express';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../middlewares/authMiddleware';

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
    console.error('Get notifications error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
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
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
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
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
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
    console.error('Delete notification error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
