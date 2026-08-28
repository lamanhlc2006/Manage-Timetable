import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { ShareLink } from '../models/ShareLink';
import { Schedule } from '../models/Schedule';
import { AuthRequest } from '../middlewares/authMiddleware';
import { handleControllerError } from '../utils/errorHandler';
import { expandRecurringEvents } from '../config/recurrenceHelper';

/**
 * @desc    Create a share link for user's calendar
 * @route   POST /api/share/create
 * @access  Private
 */
export const createShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const { expiresIn, password, label } = req.body;

    const { randomUUID } = await import('crypto');
    const token = randomUUID();

    let expiresAt: Date | undefined;
    if (expiresIn) {
      const hours = Number(expiresIn);
      if (hours > 0) {
        expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      }
    }

    let hashedPassword: string | undefined;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const shareLink = await ShareLink.create({
      token,
      createdBy: req.user._id,
      permission: 'view',
      expiresAt,
      password: hashedPassword,
      label: label || undefined,
    });

    res.status(201).json({
      _id: shareLink._id,
      token: shareLink.token,
      permission: shareLink.permission,
      expiresAt: shareLink.expiresAt,
      hasPassword: !!password,
      label: shareLink.label,
      isActive: shareLink.isActive,
      accessCount: shareLink.accessCount,
      createdAt: shareLink.createdAt,
    });
  } catch (error: any) {
    handleControllerError(res, error, 'Create share link error');
  }
};

/**
 * @desc    List all share links for current user
 * @route   GET /api/share/my-links
 * @access  Private
 */
export const getMyShareLinks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const links = await ShareLink.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .select('-password');

    res.json(links);
  } catch (error: any) {
    handleControllerError(res, error, 'Get share links error');
  }
};

/**
 * @desc    Delete a share link
 * @route   DELETE /api/share/:id
 * @access  Private (owner only)
 */
export const deleteShareLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const link = await ShareLink.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!link) {
      res.status(404).json({ message: 'Share link not found' });
      return;
    }

    res.json({ message: 'Share link deleted' });
  } catch (error: any) {
    handleControllerError(res, error, 'Delete share link error');
  }
};

/**
 * @desc    Access a shared calendar (public, no auth)
 * @route   GET /api/share/:token
 * @access  Public
 */
export const getSharedCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    const link = await ShareLink.findOne({ token, isActive: true });

    if (!link) {
      res.status(404).json({ message: 'Link chia sẻ không tồn tại hoặc đã hết hạn' });
      return;
    }

    // Check expiry
    if (link.expiresAt && new Date() > link.expiresAt) {
      res.status(410).json({ message: 'Link chia sẻ đã hết hạn' });
      return;
    }

    // Check password
    if (link.password) {
      if (!password) {
        res.status(401).json({ message: 'Link này yêu cầu mật khẩu', requiresPassword: true });
        return;
      }
      const isMatch = await bcrypt.compare(String(password), link.password);
      if (!isMatch) {
        res.status(401).json({ message: 'Mật khẩu không đúng', requiresPassword: true });
        return;
      }
    }

    // Increment access count
    link.accessCount += 1;
    await link.save();

    // Fetch schedules — expand 3 months around now
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    const schedules = await Schedule.find({ createdBy: link.createdBy })
      .select('title description startTime endTime color category tags priority status recurrence isAllDay')
      .lean();

    const expanded = expandRecurringEvents(schedules as any, rangeStart, rangeEnd);

    // Strip sensitive info, return read-only data
    const events = expanded.map((s: any) => ({
      _id: s._id,
      title: s.title,
      description: s.description || '',
      startTime: s.startTime,
      endTime: s.endTime,
      color: s.color || '#1890ff',
      category: s.category || '',
      tags: s.tags || [],
      priority: s.priority || 'medium',
      status: s.status || 'pending',
      isAllDay: s.isAllDay || false,
    }));

    res.json({
      events,
      owner: undefined, // Don't expose owner info
      permission: link.permission,
      label: link.label,
    });
  } catch (error: any) {
    handleControllerError(res, error, 'Get shared calendar error');
  }
};
