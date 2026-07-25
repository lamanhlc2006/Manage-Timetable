import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import {
  getGoogleAuthUrl as generateGoogleAuthUrl,
  handleGoogleOAuthCallback,
  syncGoogleCalendar2Way,
} from '../services/googleCalendarService';
import { handleControllerError } from '../utils/errorHandler';

/**
 * @desc    Get Google OAuth2 Authorization URL
 * @route   GET /api/auth/google/url
 * @access  Private
 */
export const getGoogleAuthUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const url = generateGoogleAuthUrl(req.user._id.toString());
    res.json({ url });
  } catch (error: any) {
    handleControllerError(res, error, 'Get Google Auth URL error');
  }
};

/**
 * @desc    Handle Google OAuth2 Callback
 * @route   GET /api/auth/google/callback
 * @access  Public / Private
 */
export const googleCallback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      res.status(400).send('Invalid OAuth callback parameters');
      return;
    }

    await handleGoogleOAuthCallback(code as string, state as string);

    const frontendUrl = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')[0]
      : 'http://localhost:5173';

    res.redirect(`${frontendUrl}/settings?google_sync=success`);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    const frontendUrl = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')[0]
      : 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?google_sync=error`);
  }
};

/**
 * @desc    Get Google Sync Status for current user
 * @route   GET /api/auth/google/status
 * @access  Private
 */
export const getGoogleSyncStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      connected: !!(user.googleTokens && user.googleTokens.access_token),
      syncEnabled: user.googleCalendarSyncEnabled || false,
      lastSyncAt: user.lastGoogleSyncAt || null,
    });
  } catch (error: any) {
    handleControllerError(res, error, 'Get Google sync status error');
  }
};

/**
 * @desc    Toggle Google Calendar Auto-sync
 * @route   POST /api/auth/google/toggle-sync
 * @access  Private
 */
export const toggleGoogleSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const { enabled } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.googleCalendarSyncEnabled = enabled === true;
    await user.save();

    res.json({
      message: `Đã ${user.googleCalendarSyncEnabled ? 'bật' : 'tắt'} tự động đồng bộ Google Calendar`,
      syncEnabled: user.googleCalendarSyncEnabled,
    });
  } catch (error: any) {
    handleControllerError(res, error, 'Toggle Google sync error');
  }
};

/**
 * @desc    Disconnect Google Calendar
 * @route   POST /api/auth/google/disconnect
 * @access  Private
 */
export const disconnectGoogle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.googleTokens = undefined;
    user.googleCalendarSyncEnabled = false;
    await user.save();

    res.json({ message: 'Đã ngắt kết nối với Google Calendar' });
  } catch (error: any) {
    handleControllerError(res, error, 'Disconnect Google error');
  }
};

/**
 * @desc    Trigger Manual 2-Way Google Calendar Sync Now
 * @route   POST /api/auth/google/sync-now
 * @access  Private
 */
export const syncGoogleNow = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const result = await syncGoogleCalendar2Way(req.user._id.toString());
    res.json(result);
  } catch (error: any) {
    handleControllerError(res, error, 'Google sync now error');
  }
};
