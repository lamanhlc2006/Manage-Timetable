import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';

// Helper function to generate JWT
const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d',
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { username, email, password, role } = req.body;

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
      role: role || 'user', // Default to 'user' if not specified
    });

    if (user) {
      const token = generateToken(user._id.toString());
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token,
      });
    } else {
      res.status(400).json({ message: 'Dữ liệu người dùng không hợp lệ.' });
    }
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Lỗi hệ thống khi đăng ký.' });
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
      const token = generateToken(user._id.toString());
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        token,
      });
    } else {
      res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Lỗi hệ thống khi đăng nhập.' });
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
    });
  } catch (error: any) {
    console.error('Profile error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Logout user and clear token cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ message: 'Logged out successfully' });
};

/**
 * @desc    Update user profile
 * @route   PATCH /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  const { username, email } = req.body;

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
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message || 'Lỗi hệ thống khi cập nhật hồ sơ.' });
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
    console.error('Change password error:', error);
    res.status(500).json({ message: error.message || 'Lỗi hệ thống khi đổi mật khẩu.' });
  }
};
