import { Response } from 'express';
import { Schedule } from '../models/Schedule';
import { AuthRequest } from '../middlewares/authMiddleware';
import { expandRecurringEvents } from '../config/recurrenceHelper';

/**
 * @desc    Get all schedules
 * @route   GET /api/schedules
 * @access  Private (Registered users)
 */
export const getSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startTime, endTime } = req.query;
    const rangeStart = startTime ? new Date(startTime as string) : new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const rangeEnd = endTime ? new Date(endTime as string) : new Date(Date.now() + 180 * 24 * 3600 * 1000);

    const dateQuery = {
      $or: [
        {
          'recurrence.type': { $exists: true, $ne: 'none' },
          startTime: { $lt: rangeEnd },
          $or: [
            { 'recurrence.endDate': { $exists: false } },
            { 'recurrence.endDate': null },
            { 'recurrence.endDate': { $gte: rangeStart } }
          ]
        },
        {
          $or: [
            { 'recurrence.type': { $exists: false } },
            { 'recurrence.type': 'none' }
          ],
          startTime: { $lt: rangeEnd },
          endTime: { $gt: rangeStart }
        }
      ]
    };

    const schedules = await Schedule.find(dateQuery).populate('createdBy', 'username email role');
    const expanded = expandRecurringEvents(schedules, rangeStart, rangeEnd);
    res.json(expanded);
  } catch (error: any) {
    console.error('Get schedules error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Create a new schedule event
 * @route   POST /api/schedules
 * @access  Private/Admin
 */
export const createSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, startTime, endTime, color, category, priority } = req.body;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    // Validate that startTime is a valid date
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: 'Invalid start or end date format' });
      return;
    }

    // Validate that startTime is before endTime
    if (start >= end) {
      res.status(400).json({ message: 'Start time must be strictly before end time' });
      return;
    }

    const force = req.body.force === true || req.body.forceCreate === true;

    if (!force) {
      const overlapping = await Schedule.find({
        createdBy: req.user._id,
        startTime: { $lt: end },
        endTime: { $gt: start },
      });

      if (overlapping.length > 0) {
        res.status(409).json({
          message: 'Phát hiện lịch trình bị trùng lặp!',
          conflicts: overlapping,
        });
        return;
      }
    }

    const newSchedule = await Schedule.create({
      title,
      description,
      startTime: start,
      endTime: end,
      color,
      category,
      priority,
      recurrence: req.body.recurrence,
      createdBy: req.user._id,
    });

    const populatedSchedule = await Schedule.findById(newSchedule._id).populate('createdBy', 'username email role');

    res.status(201).json(populatedSchedule);
  } catch (error: any) {
    console.error('Create schedule error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Update a schedule event
 * @route   PUT /api/schedules/:id
 * @access  Private/Admin
 */
export const updateSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, description, startTime, endTime, color, category, priority, recurrence, recurrenceEditMode } = req.body;

  try {
    let targetId = id;
    let isVirtualInstance = false;
    let instanceTimestamp = 0;

    if (id.includes('_')) {
      const parts = id.split('_');
      targetId = parts[0];
      instanceTimestamp = parseInt(parts[1], 10);
      isVirtualInstance = !isNaN(instanceTimestamp);
    }

    const schedule = await Schedule.findById(targetId);

    if (!schedule) {
      res.status(404).json({ message: 'Schedule event not found' });
      return;
    }

    // Check dates if updating either startTime or endTime
    const start = startTime ? new Date(startTime) : new Date(schedule.startTime);
    const end = endTime ? new Date(endTime) : new Date(schedule.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: 'Invalid date format' });
      return;
    }

    if (start >= end) {
      res.status(400).json({ message: 'Start time must be strictly before end time' });
      return;
    }

    const force = req.body.force === true || req.body.forceCreate === true;

    if (!force && req.user) {
      const overlapping = await Schedule.find({
        _id: { $ne: targetId },
        createdBy: req.user._id,
        startTime: { $lt: end },
        endTime: { $gt: start },
      });

      if (overlapping.length > 0) {
        res.status(409).json({
          message: 'Phát hiện lịch trình bị trùng lặp!',
          conflicts: overlapping,
        });
        return;
      }
    }

    if (recurrenceEditMode === 'current' && isVirtualInstance) {
      const occurrenceDate = new Date(instanceTimestamp);
      if (!schedule.recurrence) {
        schedule.recurrence = { type: 'none', interval: 1 };
      }
      if (!schedule.recurrence.exceptions) {
        schedule.recurrence.exceptions = [];
      }
      schedule.recurrence.exceptions.push(occurrenceDate);
      await schedule.save();

      const newExceptionSchedule = await Schedule.create({
        title: title !== undefined ? title : schedule.title,
        description: description !== undefined ? description : schedule.description,
        startTime: start,
        endTime: end,
        color: color !== undefined ? color : schedule.color,
        category: category !== undefined ? category : schedule.category,
        priority: priority !== undefined ? priority : schedule.priority,
        createdBy: req.user?._id || schedule.createdBy,
        isException: true,
        parentEvent: schedule._id,
      });

      const populated = await Schedule.findById(newExceptionSchedule._id).populate('createdBy', 'username email role');
      res.json(populated);
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (category !== undefined) updateData.category = category;
    if (priority !== undefined) updateData.priority = priority;
    if (recurrence !== undefined) updateData.recurrence = recurrence;
    if (startTime !== undefined) updateData.startTime = start;
    if (endTime !== undefined) updateData.endTime = end;

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      targetId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email role');

    res.json(updatedSchedule);
  } catch (error: any) {
    console.error('Update schedule error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Delete a schedule event
 * @route   DELETE /api/schedules/:id
 * @access  Private/Admin
 */
export const deleteSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const deleteMode = req.query.deleteMode || 'all';

  try {
    let targetId = id;
    let instanceTimestamp = 0;

    if (id.includes('_')) {
      const parts = id.split('_');
      targetId = parts[0];
      instanceTimestamp = parseInt(parts[1], 10);
    }

    const schedule = await Schedule.findById(targetId);

    if (!schedule) {
      res.status(404).json({ message: 'Schedule event not found' });
      return;
    }

    if (deleteMode === 'current' && instanceTimestamp > 0) {
      const occurrenceDate = new Date(instanceTimestamp);
      if (!schedule.recurrence) {
        schedule.recurrence = { type: 'none', interval: 1 };
      }
      if (!schedule.recurrence.exceptions) {
        schedule.recurrence.exceptions = [];
      }
      schedule.recurrence.exceptions.push(occurrenceDate);
      await schedule.save();

      res.json({ message: 'Lịch trình ảo đã được loại bỏ thành công', id });
      return;
    }

    await Schedule.findByIdAndDelete(targetId);
    await Schedule.deleteMany({ parentEvent: targetId });

    res.json({ message: 'Toàn bộ chuỗi lịch trình lặp đã được xóa thành công', id: targetId });
  } catch (error: any) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * @desc    Search and filter schedules
 * @route   GET /api/schedules/search
 * @access  Private (Registered users)
 */
export const searchSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  const { keyword, categories, priority, startTime, endTime } = req.query;

  try {
    const rangeStart = startTime ? new Date(startTime as string) : new Date(Date.now() - 90 * 24 * 3600 * 1000);
    const rangeEnd = endTime ? new Date(endTime as string) : new Date(Date.now() + 180 * 24 * 3600 * 1000);

    const query: any = {};

    if (keyword) {
      query.$or = [
        { title: { $regex: keyword as string, $options: 'i' } },
        { description: { $regex: keyword as string, $options: 'i' } },
      ];
    }

    if (categories) {
      const categoryList = Array.isArray(categories)
        ? categories
        : (categories as string).split(',').map((c) => c.trim()).filter(Boolean);
      if (categoryList.length > 0) {
        query.category = { $in: categoryList };
      }
    }

    if (priority) {
      const priorityList = Array.isArray(priority)
        ? priority
        : (priority as string).split(',').map((p) => p.trim()).filter(Boolean);
      if (priorityList.length > 0) {
        query.priority = { $in: priorityList };
      }
    }

    const dateQuery = {
      $or: [
        {
          'recurrence.type': { $exists: true, $ne: 'none' },
          startTime: { $lt: rangeEnd },
          $or: [
            { 'recurrence.endDate': { $exists: false } },
            { 'recurrence.endDate': null },
            { 'recurrence.endDate': { $gte: rangeStart } }
          ]
        },
        {
          $or: [
            { 'recurrence.type': { $exists: false } },
            { 'recurrence.type': 'none' }
          ],
          startTime: { $lt: rangeEnd },
          endTime: { $gt: rangeStart }
        }
      ]
    };

    const finalQuery = query.$or
      ? { $and: [ { $or: query.$or }, dateQuery ] }
      : { ...query, ...dateQuery };

    const schedules = await Schedule.find(finalQuery).populate('createdBy', 'username email role');
    const expanded = expandRecurringEvents(schedules, rangeStart, rangeEnd);
    res.json(expanded);
  } catch (error: any) {
    console.error('Search schedules error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
