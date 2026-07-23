import { Request, Response } from 'express';
import FocusSession from '../models/FocusSession';

interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
  };
}

// @desc    Log a completed focus session
// @route   POST /api/focus-sessions
// @access  Private
export const createFocusSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Không tìm thấy thông tin người dùng' });
      return;
    }

    const { scheduleId, title, category, durationMinutes, sessionType } = req.body;

    if (!durationMinutes || durationMinutes <= 0) {
      res.status(400).json({ message: 'Thời gian tập trung không hợp lệ' });
      return;
    }

    const newSession = await FocusSession.create({
      userId,
      scheduleId: scheduleId || undefined,
      title: title || (sessionType === 'focus' ? 'Focus Session' : 'Nghỉ giải lao'),
      category: category || 'Khác',
      durationMinutes,
      sessionType: sessionType || 'focus',
      completedAt: new Date(),
    });

    res.status(201).json({
      message: 'Đã lưu phiên tập trung thành công',
      data: newSession,
    });
  } catch (error: any) {
    console.error('Error logging focus session:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lưu phiên tập trung', error: error.message });
  }
};

// @desc    Get focus session history with optional date filtering
// @route   GET /api/focus-sessions
// @access  Private
export const getFocusSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Không tìm thấy thông tin người dùng' });
      return;
    }

    const { startTime, endTime, sessionType } = req.query;
    const filter: any = { userId };

    if (sessionType) {
      filter.sessionType = sessionType;
    }

    if (startTime || endTime) {
      filter.completedAt = {};
      if (startTime) filter.completedAt.$gte = new Date(startTime as string);
      if (endTime) filter.completedAt.$lte = new Date(endTime as string);
    }

    const sessions = await FocusSession.find(filter)
      .sort({ completedAt: -1 })
      .populate('scheduleId', 'title category color')
      .limit(100);

    res.status(200).json(sessions);
  } catch (error: any) {
    console.error('Error fetching focus sessions:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi lấy danh sách tập trung', error: error.message });
  }
};

// @desc    Get focus statistics summary (Total minutes, sessions count, distribution)
// @route   GET /api/focus-sessions/stats
// @access  Private
export const getFocusStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'Không tìm thấy thông tin người dùng' });
      return;
    }

    const { startTime, endTime } = req.query;
    const dateFilter: any = {};
    if (startTime) dateFilter.$gte = new Date(startTime as string);
    if (endTime) dateFilter.$lte = new Date(endTime as string);

    const filter: any = { userId, sessionType: 'focus' };
    if (Object.keys(dateFilter).length > 0) {
      filter.completedAt = dateFilter;
    }

    const sessions = await FocusSession.find(filter);

    let totalFocusMinutes = 0;
    const categoryMap: { [cat: string]: number } = {};
    const dayMap: { [day: string]: number } = {};

    sessions.forEach((s) => {
      totalFocusMinutes += s.durationMinutes;
      const cat = s.category || 'Khác';
      categoryMap[cat] = (categoryMap[cat] || 0) + s.durationMinutes;

      const dateStr = s.completedAt.toISOString().split('T')[0];
      dayMap[dateStr] = (dayMap[dateStr] || 0) + s.durationMinutes;
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, minutes]) => ({
      category,
      minutes,
      hours: Number((minutes / 60).toFixed(1)),
    }));

    const dailyBreakdown = Object.entries(dayMap).map(([date, minutes]) => ({
      date,
      minutes,
      hours: Number((minutes / 60).toFixed(1)),
    }));

    res.status(200).json({
      totalSessions: sessions.length,
      totalFocusMinutes,
      totalFocusHours: Number((totalFocusMinutes / 60).toFixed(1)),
      categoryBreakdown,
      dailyBreakdown,
    });
  } catch (error: any) {
    console.error('Error computing focus stats:', error);
    res.status(500).json({ message: 'Lỗi máy chủ khi tính toán thống kê tập trung', error: error.message });
  }
};
