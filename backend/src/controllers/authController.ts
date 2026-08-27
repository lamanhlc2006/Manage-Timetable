import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { AuthRequest } from '../middlewares/authMiddleware';
import { handleControllerError } from '../utils/errorHandler';

const getJwtSecret = (): string => {
  if (!process.env.JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not configured');
  return process.env.JWT_SECRET;
};
const getJwtRefreshSecret = (): string => {
  if (!process.env.JWT_REFRESH_SECRET) throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is not configured');
  return process.env.JWT_REFRESH_SECRET;
};

// Helper function to generate Access Token (15 minutes expiration)
const generateAccessToken = (id: string): string => {
  return jwt.sign({ id }, getJwtSecret(), {
    expiresIn: '15m',
  });
};

// Helper function to generate Refresh Token (7 days expiration)
const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id }, getJwtRefreshSecret(), {
    expiresIn: '7d',
  });
};

// Helper function to set authentication cookies
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSiteSetting = isProduction ? 'strict' : 'lax';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: sameSiteSetting,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: sameSiteSetting,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body;

  try {
    const cleanUsername = username ? username.trim() : '';
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    if (!cleanUsername || !cleanEmail || !password) {
      res.status(400).json({ message: 'Vui lòng điền đầy đủ các thông tin bắt buộc.' });
      return;
    }

    // Check if user already exists
    const userExists = await User.findOne({
      $or: [
        { email: cleanEmail },
        { username: cleanUsername },
      ],
    });

    if (userExists) {
      res.status(400).json({ message: 'Tên tài khoản hoặc email đã được đăng ký.' });
      return;
    }

    // Create new user
    const user = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password,
      role: 'user',
    });

    if (user) {
      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

      await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt,
      });

      setAuthCookies(res, accessToken, refreshToken);

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: accessToken,
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu người dùng không hợp lệ.' });
    }
  } catch (error: any) {
    handleControllerError(res, error, 'Register error');
  }
};

/**
 * @desc    Authenticate user and get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    // Find user by email
    const user = await User.findOne({ email: cleanEmail });

    // Validate password and generate token
    if (user && (await user.matchPassword(password))) {
      if (user.isActive === false) {
        res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.' });
        return;
      }

      const accessToken = generateAccessToken(user._id.toString());
      const refreshToken = generateRefreshToken(user._id.toString());
      const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

      await RefreshToken.create({
        token: refreshToken,
        user: user._id,
        expiresAt,
      });

      setAuthCookies(res, accessToken, refreshToken);

      // Update lastLoginAt timestamp
      await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token: accessToken,
      });
    } else {
      res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
    }
  } catch (error: any) {
    handleControllerError(res, error, 'Login error');
  }
};

/**
 * @desc    Refresh access token using refresh token rotation
 * @route   POST /api/auth/refresh
 * @access  Public
 */
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ message: 'No refresh token provided' });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    } catch (err) {
      res.status(401).json({ message: 'Invalid or expired refresh token' });
      return;
    }

    const existingToken = await RefreshToken.findOne({ token: refreshToken });

    if (!existingToken) {
      res.status(401).json({ message: 'Refresh token not found in database' });
      return;
    }

    // Reuse Detection Security: If a revoked token is used, invalidate all sessions for this user!
    if (existingToken.isRevoked) {
      console.warn(`[Security Alert] Revoked refresh token reuse detected for user ${existingToken.user}`);
      await RefreshToken.updateMany({ user: existingToken.user }, { isRevoked: true });
      const isProduction = process.env.NODE_ENV === 'production';
      const sameSiteSetting = isProduction ? 'strict' : 'lax';
      res.cookie('token', '', { httpOnly: true, expires: new Date(0), secure: isProduction, sameSite: sameSiteSetting });
      res.cookie('accessToken', '', { httpOnly: true, expires: new Date(0), secure: isProduction, sameSite: sameSiteSetting });
      res.cookie('refreshToken', '', { httpOnly: true, expires: new Date(0), secure: isProduction, sameSite: sameSiteSetting });
      res.status(401).json({ message: 'Revoked refresh token reused. All sessions invalidated.' });
      return;
    }

    const user = await User.findById(decoded.id);
    if (!user || user.isActive === false) {
      res.status(401).json({ message: 'User unauthorized or account suspended' });
      return;
    }

    // Rotate tokens: Revoke old refresh token & create new pair
    const newAccessToken = generateAccessToken(user._id.toString());
    const newRefreshToken = generateRefreshToken(user._id.toString());
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    existingToken.isRevoked = true;
    existingToken.replacedByToken = newRefreshToken;
    await existingToken.save();

    await RefreshToken.create({
      token: newRefreshToken,
      user: user._id,
      expiresAt,
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({
      token: newAccessToken,
    });
  } catch (error: any) {
    handleControllerError(res, error, 'Refresh token error');
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    res.json({
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      bufferMinutes: (req.user as any).bufferMinutes || 0,
      emailNotifications: (req.user as any).emailNotifications || false,
      notificationEmail: (req.user as any).notificationEmail || '',
      calendarFeedToken: (req.user as any).calendarFeedToken || '',
    });
  } catch (error: any) {
    handleControllerError(res, error, 'Profile error');
  }
};

/**
 * @desc    Logout user and clear token cookies
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (refreshToken) {
      await RefreshToken.updateOne({ token: refreshToken }, { isRevoked: true });
    }
  } catch (e) {
    console.error('Error revoking refresh token during logout:', e);
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const sameSiteSetting = isProduction ? 'strict' : 'lax';
  res.cookie('token', '', { httpOnly: true, expires: new Date(0), secure: isProduction, sameSite: sameSiteSetting });
  res.cookie('accessToken', '', { httpOnly: true, expires: new Date(0), secure: isProduction, sameSite: sameSiteSetting });
  res.cookie('refreshToken', '', { httpOnly: true, expires: new Date(0), secure: isProduction, sameSite: sameSiteSetting });

  res.json({ message: 'Logged out successfully' });
};

/**
 * @desc    Update user profile
 * @route   PATCH /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, email, bufferMinutes, emailNotifications, notificationEmail } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    const cleanUsername = username ? username.trim() : '';
    const cleanEmail = email ? email.toLowerCase().trim() : '';

    if (!cleanUsername || !cleanEmail) {
      res.status(400).json({ message: 'Vui lòng điền đầy đủ username và email.' });
      return;
    }

    // Check if new username or email is already taken by someone else
    if (cleanUsername !== user.username || cleanEmail !== user.email) {
      const existingUser = await User.findOne({
        _id: { $ne: user._id },
        $or: [
          { username: cleanUsername },
          { email: cleanEmail }
        ]
      });

      if (existingUser) {
        res.status(400).json({ message: 'Tên tài khoản hoặc email đã tồn tại.' });
        return;
      }
    }

    user.username = cleanUsername;
    user.email = cleanEmail;

    // Update buffer minutes if provided
    if (bufferMinutes !== undefined) {
      const buffer = Math.max(0, Math.min(60, Number(bufferMinutes) || 0));
      (user as any).bufferMinutes = buffer;
    }

    // Update email notification preferences
    if (emailNotifications !== undefined) {
      (user as any).emailNotifications = !!emailNotifications;
    }
    if (notificationEmail !== undefined) {
      (user as any).notificationEmail = notificationEmail ? notificationEmail.toLowerCase().trim() : '';
    }

    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      bufferMinutes: (user as any).bufferMinutes || 0,
      emailNotifications: (user as any).emailNotifications || false,
      notificationEmail: (user as any).notificationEmail || '',
    });
  } catch (error: any) {
    handleControllerError(res, error, 'Update profile error');
  }
};

/**
 * @desc    Change user password
 * @route   PATCH /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(400).json({ message: 'Mật khẩu hiện tại không chính xác.' });
      return;
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (error: any) {
    handleControllerError(res, error, 'Change password error');
  }
};

/**
 * @desc    Generate a unique calendar feed token
 * @route   POST /api/auth/generate-feed-token
 * @access  Private
 */
export const generateFeedToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }
    const { randomUUID } = await import('crypto');
    const token = randomUUID();
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { calendarFeedToken: token },
      { new: true }
    );
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ calendarFeedToken: token });
  } catch (error: any) {
    handleControllerError(res, error, 'Generate feed token error');
  }
};

/**
 * @desc    Revoke calendar feed token
 * @route   DELETE /api/auth/revoke-feed-token
 * @access  Private
 */
export const revokeFeedToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }
    await User.findByIdAndUpdate(req.user._id, { $unset: { calendarFeedToken: 1 } });
    res.json({ message: 'Feed token revoked' });
  } catch (error: any) {
    handleControllerError(res, error, 'Revoke feed token error');
  }
};
