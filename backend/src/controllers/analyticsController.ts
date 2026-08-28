import { Response } from 'express';
import { Schedule } from '../models/Schedule';
import { AuthRequest } from '../middlewares/authMiddleware';
import { handleControllerError } from '../utils/errorHandler';

/**
 * @desc    Advanced analytics: time distribution by category, completion rate, weekly trend, heatmap
 * @route   GET /api/analytics/advanced
 * @access  Private
 */
export const getAdvancedAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }

    const { weeks = '8' } = req.query;
    const numWeeks = Math.min(Math.max(Number(weeks) || 8, 4), 24);
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - numWeeks * 7);

    const userId = req.user._id;

    // 1. Time distribution by category (stacked bar data)
    const categoryDistribution = await Schedule.aggregate([
      { $match: { createdBy: userId, startTime: { $gte: startDate } } },
      {
        $project: {
          category: { $ifNull: ['$category', 'Khác'] },
          week: { $isoWeek: '$startTime' },
          year: { $isoWeekYear: '$startTime' },
          hours: {
            $divide: [
              { $subtract: ['$endTime', '$startTime'] },
              3600000,
            ],
          },
        },
      },
      {
        $group: {
          _id: { year: '$year', week: '$week', category: '$category' },
          hours: { $sum: '$hours' },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
    ]);

    // 2. Completion rate over weeks
    const completionTrend = await Schedule.aggregate([
      { $match: { createdBy: userId, startTime: { $gte: startDate } } },
      {
        $project: {
          week: { $isoWeek: '$startTime' },
          year: { $isoWeekYear: '$startTime' },
          isCompleted: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          hours: {
            $divide: [
              { $subtract: ['$endTime', '$startTime'] },
              3600000,
            ],
          },
        },
      },
      {
        $group: {
          _id: { year: '$year', week: '$week' },
          totalHours: { $sum: '$hours' },
          totalCount: { $sum: 1 },
          completedCount: { $sum: '$isCompleted' },
        },
      },
      { $sort: { '_id.year': 1, '_id.week': 1 } },
      {
        $project: {
          week: '$_id.week',
          year: '$_id.year',
          totalHours: { $round: ['$totalHours', 1] },
          totalCount: 1,
          completedCount: 1,
          completionRate: {
            $round: [
              {
                $multiply: [
                  { $cond: [{ $eq: ['$totalCount', 0] }, 0, { $divide: ['$completedCount', '$totalCount'] }] },
                  100,
                ],
              },
              1,
            ],
          },
        },
      },
    ]);

    // 3. Heatmap: day-of-week x hour-of-day
    const heatmapData = await Schedule.aggregate([
      { $match: { createdBy: userId, startTime: { $gte: startDate } } },
      {
        $project: {
          dayOfWeek: { $dayOfWeek: '$startTime' }, // 1=Sun, 7=Sat
          hour: { $hour: '$startTime' },
          hours: {
            $divide: [
              { $subtract: ['$endTime', '$startTime'] },
              3600000,
            ],
          },
        },
      },
      {
        $group: {
          _id: { dayOfWeek: '$dayOfWeek', hour: '$hour' },
          count: { $sum: 1 },
          totalHours: { $sum: '$hours' },
        },
      },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
    ]);

    res.json({
      categoryDistribution,
      completionTrend,
      heatmapData,
    });
  } catch (error: any) {
    handleControllerError(res, error, 'Advanced analytics error');
  }
};
