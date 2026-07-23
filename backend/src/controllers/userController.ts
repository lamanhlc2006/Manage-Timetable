import { Response } from 'express';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { Schedule } from '../models/Schedule';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * @desc    Get all users (paginated + search)
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const query: any = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const pages = Math.ceil(total / limit);

    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const scheduleCount = await Schedule.countDocuments({ createdBy: u._id });
        return {
          ...u.toObject(),
          scheduleCount,
        };
      })
    );

    res.json({
      users: usersWithStats,
      total,
      page,
      pages,
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Update user role
 * @route   PUT /api/users/:id/role
 * @access  Private/Admin
 */
export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    if (!['admin', 'user'].includes(role)) {
      res.status(400).json({ message: 'Invalid role value' });
      return;
    }

    // Safety check: Prevent current admin from changing their own role
    if (req.user && req.user._id.toString() === id) {
      res.status(400).json({ message: 'Không thể tự hạ quyền của chính mình!' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    user.role = role;
    await user.save();

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error: any) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Toggle user status (Lock/Unlock account)
 * @route   PUT /api/users/:id/status
 * @access  Private/Admin
 */
export const toggleUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isActive } = req.body;

  try {
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ message: 'isActive must be a boolean' });
      return;
    }

    // Safety check: Prevent current admin from locking themselves out
    if (req.user && req.user._id.toString() === id) {
      res.status(400).json({ message: 'Không thể tự khóa tài khoản của chính mình!' });
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    user.isActive = isActive;
    await user.save();

    if (isActive === false) {
      await Notification.create({
        recipient: user._id,
        type: 'system',
        title: 'Tài khoản đã bị khóa',
        message: 'Tài khoản của bạn đã bị quản trị viên khóa.',
      });
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
  } catch (error: any) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Reset user password to default by Admin
 * @route   POST /api/users/:id/reset-password
 * @access  Private/Admin
 */
export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy người dùng' });
      return;
    }

    const defaultPassword = 'user123';
    user.password = defaultPassword;
    await user.save(); // pre-save hook will hash it

    // Create system notification for user
    await Notification.create({
      recipient: user._id,
      type: 'system',
      title: 'Mật khẩu đã được reset',
      message: 'Quản trị viên đã đặt lại mật khẩu của bạn thành mặc định (user123). Vui lòng đổi lại mật khẩu sớm.',
    });

    res.json({ message: 'Đặt lại mật khẩu thành công. Mật khẩu mặc định là: user123' });
  } catch (error: any) {
    console.error('Reset user password error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
