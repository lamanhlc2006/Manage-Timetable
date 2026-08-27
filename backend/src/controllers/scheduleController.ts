import { Response } from 'express';
import ical, { ICalCalendarMethod } from 'ical-generator';
import { Schedule } from '../models/Schedule';
import { Notification } from '../models/Notification';
import { User } from '../models/User';
import { AuthRequest } from '../middlewares/authMiddleware';
import { expandRecurringEvents, checkScheduleConflicts, suggestNextAvailableSlot } from '../config/recurrenceHelper';
import { escapeRegex } from '../utils/stringUtils';
import { handleControllerError, isValidObjectId } from '../utils/errorHandler';
import { emitScheduleCreated, emitScheduleUpdated, emitScheduleDeleted } from '../config/socket';

/**
 * @desc    Get upcoming schedules in the next 24 hours
 * @route   GET /api/schedules/upcoming
 * @access  Private
 */
export const getUpcomingSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const baseConditions: any[] = [
      {
        $or: [
          {
            'recurrence.type': { $exists: true, $ne: 'none' },
            startTime: { $lt: next24h },
            $or: [
              { 'recurrence.endDate': { $exists: false } },
              { 'recurrence.endDate': null },
              { 'recurrence.endDate': { $gte: now } },
            ],
          },
          {
            $or: [
              { 'recurrence.type': { $exists: false } },
              { 'recurrence.type': 'none' },
            ],
            startTime: { $gte: now, $lte: next24h },
          },
        ],
      },
    ];

    if (req.user.role !== 'admin') {
      baseConditions.push({
        $or: [
          { createdBy: req.user._id },
          { isPublic: true },
        ],
      });
    }

    const schedules = await Schedule.find({ $and: baseConditions }).populate('createdBy', 'username email role');
    const expanded = expandRecurringEvents(schedules, now, next24h);

    const upcoming = expanded
      .filter((evt) => {
        const evtStart = new Date(evt.startTime);
        return evtStart >= now && evtStart <= next24h;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    res.json(upcoming);
  } catch (error: any) {
    handleControllerError(res, error, 'Get upcoming schedules error');
  }
};

/**
 * @desc    Bulk import schedules parsed from .ics file
 * @route   POST /api/schedules/import-ics
 * @access  Private
 */
export const importIcsSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      res.status(400).json({ message: 'Danh sách sự kiện nhập không hợp lệ hoặc trống' });
      return;
    }

    const validSchedules = events.map((item: any) => ({
      title: item.title ? String(item.title).trim() : 'Sự kiện nhập',
      description: item.description ? String(item.description).trim() : '',
      startTime: new Date(item.startTime),
      endTime: new Date(item.endTime),
      color: item.color || '#1890ff',
      category: item.category || 'Nhập từ file',
      priority: ['low', 'medium', 'high'].includes(item.priority) ? item.priority : 'medium',
      createdBy: req.user!._id,
    }));

    const filtered = validSchedules.filter(
      (s) => !isNaN(s.startTime.getTime()) && !isNaN(s.endTime.getTime()) && s.startTime < s.endTime
    );

    if (filtered.length === 0) {
      res.status(400).json({ message: 'Không có sự kiện nào hợp lệ để nhập vào hệ thống' });
      return;
    }

    const inserted = await Schedule.insertMany(filtered);

    if (req.user) {
      emitScheduleCreated(req.user._id.toString(), { count: inserted.length });
    }

    res.status(201).json({
      message: `Đã nhập thành công ${inserted.length} sự kiện vào lịch trình`,
      count: inserted.length,
      schedules: inserted,
    });
  } catch (error: any) {
    handleControllerError(res, error, 'Import ICS schedules error');
  }
};

/**
 * @desc    Get all schedules
 * @route   GET /api/schedules
 * @access  Private (Registered users)
 */
export const getSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const { startTime, endTime, creator } = req.query;
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

    const baseConditions: any[] = [dateQuery];

    if (req.user.role !== 'admin') {
      baseConditions.push({
        $or: [
          { createdBy: req.user._id },
          { isPublic: true }
        ]
      });
    } else if (creator) {
      baseConditions.push({ createdBy: creator });
    }

    const finalQuery = { $and: baseConditions };

    const schedules = await Schedule.find(finalQuery).populate('createdBy', 'username email role');
    const expanded = expandRecurringEvents(schedules, rangeStart, rangeEnd);
    res.json(expanded);
  } catch (error: any) {
    handleControllerError(res, error, 'Get schedules error');
  }
};

/**
 * @desc    Create a new schedule event
 * @route   POST /api/schedules
 * @access  Private/Admin
 */
export const createSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, description, startTime, endTime, color, category, priority, tags, isAllDay } = req.body;

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

    // Validate that startTime is before endTime (skip for all-day events)
    if (!isAllDay && start >= end) {
      res.status(400).json({ message: 'Start time must be strictly before end time' });
      return;
    }

    // Fetch user's buffer setting
    const currentUser = await User.findById(req.user._id).select('bufferMinutes');
    const userBuffer = (currentUser as any)?.bufferMinutes || 0;

    // Always check for time conflicts — overlapping events are not allowed
    const overlapping = await checkScheduleConflicts(
      req.user._id.toString(),
      start,
      end,
      undefined,
      req.body.recurrence,
      userBuffer
    );

    if (overlapping.length > 0) {
      // Suggest the next available time slot with the same duration
      const durationMs = end.getTime() - start.getTime();
      const suggestedSlot = await suggestNextAvailableSlot(
        req.user._id.toString(),
        durationMs,
        start
      );

      res.status(409).json({
        message: 'Phát hiện lịch trình bị trùng lặp!',
        conflicts: overlapping,
        suggestedSlot,
      });
      return;
    }

    const reminderMinutes = req.body.reminderMinutes !== undefined ? req.body.reminderMinutes : null;

    const newSchedule = await Schedule.create({
      title,
      description,
      startTime: start,
      endTime: end,
      color,
      category,
      tags: tags || [],
      priority,
      recurrence: req.body.recurrence,
      isAllDay: isAllDay || false,
      reminderMinutes,
      reminderSent: false,
      createdBy: req.user._id,
    });

    const populatedSchedule = await Schedule.findById(newSchedule._id).populate('createdBy', 'username email role');

    // Emit Socket.IO real-time event
    if (req.user) {
      emitScheduleCreated(req.user._id.toString(), populatedSchedule);
    }

    // Auto-create notifications for other active users when an Admin creates a schedule
    if (req.user && req.user.role === 'admin') {
      const otherUsers = await User.find({ _id: { $ne: req.user._id }, isActive: true }).select('_id');
      if (otherUsers.length > 0) {
        const notifications = otherUsers.map((u) => ({
          recipient: u._id,
          type: 'update',
          title: 'Lịch trình mới được khởi tạo',
          message: `Quản trị viên đã tạo lịch trình mới: "${newSchedule.title}".`,
          relatedSchedule: newSchedule._id,
        }));
        await Notification.insertMany(notifications);
      }
    }

    res.status(201).json(populatedSchedule);
  } catch (error: any) {
    handleControllerError(res, error, 'Create schedule error');
  }
};

/**
 * @desc    Update a schedule event
 * @route   PUT /api/schedules/:id
 * @access  Private/Admin
 */
export const updateSchedule = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { title, description, startTime, endTime, color, category, priority, tags, recurrence, recurrenceEditMode, isAllDay } = req.body;

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

    if (!isValidObjectId(targetId)) {
      res.status(400).json({ message: 'Định dạng ID lịch trình không hợp lệ' });
      return;
    }

    const schedule = await Schedule.findById(targetId);

    if (!schedule) {
      res.status(404).json({ message: 'Schedule event not found' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const createdById = (schedule.createdBy as any)._id
      ? (schedule.createdBy as any)._id.toString()
      : schedule.createdBy.toString();

    const isOwner = createdById === req.user._id.toString();
    const isAdminUser = req.user.role === 'admin';

    if (!isOwner && !isAdminUser) {
      res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa/xóa lịch trình này' });
      return;
    }

    // Check dates if updating either startTime or endTime
    const start = startTime ? new Date(startTime) : new Date(schedule.startTime);
    const end = endTime ? new Date(endTime) : new Date(schedule.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ message: 'Invalid date format' });
      return;
    }

    if (!isAllDay && start >= end) {
      res.status(400).json({ message: 'Start time must be strictly before end time' });
      return;
    }

    // Skip conflict check for status-only updates (toggle complete/pending)
    const isStatusOnlyUpdate = req.body.status !== undefined &&
      !req.body.title && !req.body.startTime && !req.body.endTime && !req.body.recurrence;

    if (!isStatusOnlyUpdate && req.user) {
      const effectiveRecurrence = recurrence !== undefined ? recurrence : schedule.recurrence;
      const updateUser = await User.findById(req.user._id).select('bufferMinutes');
      const updateBuffer = (updateUser as any)?.bufferMinutes || 0;
      const overlapping = await checkScheduleConflicts(
        req.user._id.toString(),
        start,
        end,
        targetId,
        effectiveRecurrence,
        updateBuffer
      );

      if (overlapping.length > 0) {
        // Suggest the next available time slot with the same duration
        const durationMs = end.getTime() - start.getTime();
        const suggestedSlot = await suggestNextAvailableSlot(
          req.user._id.toString(),
          durationMs,
          start,
          targetId
        );

        res.status(409).json({
          message: 'Phát hiện lịch trình bị trùng lặp!',
          conflicts: overlapping,
          suggestedSlot,
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
        tags: tags !== undefined ? tags : schedule.tags,
        priority: priority !== undefined ? priority : schedule.priority,
        status: req.body.status !== undefined ? req.body.status : (schedule as any).status || 'pending',
        reminderMinutes: req.body.reminderMinutes !== undefined ? req.body.reminderMinutes : schedule.reminderMinutes,
        createdBy: req.user?._id || schedule.createdBy,
        isException: true,
        parentEvent: schedule._id,
      });

      const populated = await Schedule.findById(newExceptionSchedule._id).populate('createdBy', 'username email role');
      res.json(populated);
      return;
    }

    if (recurrenceEditMode === 'future') {
      const occurrenceDate = isVirtualInstance && instanceTimestamp > 0
        ? new Date(instanceTimestamp)
        : new Date(start);

      const dayBefore = new Date(occurrenceDate.getTime() - 1000);
      if (!schedule.recurrence) {
        schedule.recurrence = { type: 'none', interval: 1 };
      }
      schedule.recurrence.endDate = dayBefore;
      await schedule.save();

      await Schedule.deleteMany({
        parentEvent: targetId,
        startTime: { $gte: occurrenceDate },
      });

      const newRecurrence = recurrence || {
        type: schedule.recurrence.type,
        interval: schedule.recurrence.interval || 1,
        daysOfWeek: schedule.recurrence.daysOfWeek,
      };

      const newSchedule = await Schedule.create({
        title: title !== undefined ? title : schedule.title,
        description: description !== undefined ? description : schedule.description,
        startTime: start,
        endTime: end,
        color: color !== undefined ? color : schedule.color,
        category: category !== undefined ? category : schedule.category,
        tags: tags !== undefined ? tags : schedule.tags,
        priority: priority !== undefined ? priority : schedule.priority,
        status: req.body.status !== undefined ? req.body.status : (schedule as any).status || 'pending',
        reminderMinutes: req.body.reminderMinutes !== undefined ? req.body.reminderMinutes : schedule.reminderMinutes,
        recurrence: newRecurrence,
        createdBy: req.user?._id || schedule.createdBy,
      });

      const populated = await Schedule.findById(newSchedule._id).populate('createdBy', 'username email role');
      res.json(populated);
      return;
    }

    const reminderMinutes = req.body.reminderMinutes;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (priority !== undefined) updateData.priority = priority;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (recurrence !== undefined) updateData.recurrence = recurrence;
    if (isAllDay !== undefined) updateData.isAllDay = isAllDay;
    if (startTime !== undefined) updateData.startTime = start;
    if (endTime !== undefined) updateData.endTime = end;
    if (reminderMinutes !== undefined) {
      updateData.reminderMinutes = reminderMinutes;
      updateData.reminderSent = false;
    } else if (startTime !== undefined) {
      updateData.reminderSent = false;
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      targetId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username email role');

    const targetUserId = (schedule.createdBy as any)._id
      ? (schedule.createdBy as any)._id.toString()
      : schedule.createdBy.toString();

    if (req.user) {
      emitScheduleUpdated(targetUserId, updatedSchedule);

      if (targetUserId !== req.user._id.toString()) {
        await Notification.create({
          recipient: targetUserId,
          type: 'update',
          title: 'Lịch trình đã được thay đổi',
          message: `Lịch trình "${schedule.title}" của bạn đã được quản trị viên cập nhật.`,
          relatedSchedule: targetId,
        });
      } else if (req.user.role === 'admin') {
        const otherUsers = await User.find({ _id: { $ne: req.user._id }, isActive: true }).select('_id');
        if (otherUsers.length > 0) {
          const notifications = otherUsers.map((u) => ({
            recipient: u._id,
            type: 'update',
            title: 'Lịch trình đã được cập nhật',
            message: `Quản trị viên đã cập nhật lịch trình: "${schedule.title}".`,
            relatedSchedule: targetId,
          }));
          await Notification.insertMany(notifications);
        }
      }
    }

    res.json(updatedSchedule);
  } catch (error: any) {
    handleControllerError(res, error, 'Update schedule error');
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

    if (!isValidObjectId(targetId)) {
      res.status(400).json({ message: 'Định dạng ID lịch trình không hợp lệ' });
      return;
    }

    const schedule = await Schedule.findById(targetId);

    if (!schedule) {
      res.status(404).json({ message: 'Schedule event not found' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const createdById = (schedule.createdBy as any)._id
      ? (schedule.createdBy as any)._id.toString()
      : schedule.createdBy.toString();

    const isOwner = createdById === req.user._id.toString();
    const isAdminUser = req.user.role === 'admin';

    if (!isOwner && !isAdminUser) {
      res.status(403).json({ message: 'Bạn không có quyền chỉnh sửa/xóa lịch trình này' });
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

    if (deleteMode === 'future' && (instanceTimestamp > 0 || req.query.instanceDate)) {
      const occurrenceDate = instanceTimestamp > 0
        ? new Date(instanceTimestamp)
        : new Date(req.query.instanceDate as string);

      const dayBefore = new Date(occurrenceDate.getTime() - 1000);
      if (!schedule.recurrence) {
        schedule.recurrence = { type: 'none', interval: 1 };
      }
      schedule.recurrence.endDate = dayBefore;
      await schedule.save();

      await Schedule.deleteMany({
        parentEvent: targetId,
        startTime: { $gte: occurrenceDate },
      });

      res.json({ message: 'Sự kiện này và các sự kiện sau đó đã được xóa thành công', id: targetId });
      return;
    }

    // Send notification if admin deletes schedule belonging to another user or system schedule
    const targetUserId = (schedule.createdBy as any)._id
      ? (schedule.createdBy as any)._id.toString()
      : schedule.createdBy.toString();

    if (req.user) {
      if (targetUserId !== req.user._id.toString()) {
        await Notification.create({
          recipient: targetUserId,
          type: 'update',
          title: 'Lịch trình đã bị xóa',
          message: `Lịch trình "${schedule.title}" của bạn đã bị quản trị viên xóa.`,
        });
      } else if (req.user.role === 'admin') {
        const otherUsers = await User.find({ _id: { $ne: req.user._id }, isActive: true }).select('_id');
        if (otherUsers.length > 0) {
          const notifications = otherUsers.map((u) => ({
            recipient: u._id,
            type: 'update',
            title: 'Lịch trình đã bị hủy/xóa',
            message: `Quản trị viên đã xóa lịch trình: "${schedule.title}".`,
          }));
          await Notification.insertMany(notifications);
        }
      }
    }

    await Schedule.findByIdAndDelete(targetId);
    await Schedule.deleteMany({ parentEvent: targetId });

    if (req.user) {
      emitScheduleDeleted(targetUserId, targetId);
    }

    res.json({ message: 'Toàn bộ chuỗi lịch trình lặp đã được xóa thành công', id: targetId });
  } catch (error: any) {
    handleControllerError(res, error, 'Delete schedule error');
  }
};

/**
 * @desc    Search and filter schedules
 * @route   GET /api/schedules/search
 * @access  Private (Registered users)
 */
export const searchSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  const { keyword, categories, priority, startTime, endTime, creator, status, tags } = req.query;

  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

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

    const baseConditions: any[] = [dateQuery];

    if (req.user.role !== 'admin') {
      baseConditions.push({
        $or: [
          { createdBy: req.user._id },
          { isPublic: true }
        ]
      });
    } else if (creator) {
      baseConditions.push({ createdBy: creator });
    }

    if (keyword) {
      const sanitizedKeyword = escapeRegex(keyword as string);
      baseConditions.push({
        $or: [
          { title: { $regex: sanitizedKeyword, $options: 'i' } },
          { description: { $regex: sanitizedKeyword, $options: 'i' } },
        ]
      });
    }

    const filterQuery: any = {};
    if (categories) {
      const categoryList = Array.isArray(categories)
        ? categories
        : (categories as string).split(',').map((c) => c.trim()).filter(Boolean);
      if (categoryList.length > 0) {
        filterQuery.category = { $in: categoryList };
      }
    }

    if (priority) {
      const priorityList = Array.isArray(priority)
        ? priority
        : (priority as string).split(',').map((p) => p.trim()).filter(Boolean);
      if (priorityList.length > 0) {
        filterQuery.priority = { $in: priorityList };
      }
    }

    if (status) {
      const statusList = Array.isArray(status)
        ? status
        : (status as string).split(',').map((s) => s.trim()).filter(Boolean);
      if (statusList.length > 0) {
        filterQuery.status = { $in: statusList };
      }
    }

    if (tags) {
      const tagList = Array.isArray(tags)
        ? tags
        : (tags as string).split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        filterQuery.tags = { $all: tagList };
      }
    }

    if (Object.keys(filterQuery).length > 0) {
      baseConditions.push(filterQuery);
    }

    const finalQuery = { $and: baseConditions };

    const schedules = await Schedule.find(finalQuery).populate('createdBy', 'username email role');
    const expanded = expandRecurringEvents(schedules, rangeStart, rangeEnd);
    res.json(expanded);
  } catch (error: any) {
    handleControllerError(res, error, 'Search schedules error');
  }
};

/**
 * @desc    Export user schedules as iCalendar (.ics)
 * @route   GET /api/schedules/export/ics
 * @access  Private
 */
export const exportIcs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User unauthorized' });
      return;
    }

    const schedules = await Schedule.find({ createdBy: req.user._id });

    const calendar = ical({
      name: 'Lịch trình cá nhân - Timetable Management',
      method: ICalCalendarMethod.PUBLISH,
    });

    schedules.forEach((sch) => {
      calendar.createEvent({
        id: sch._id.toString(),
        start: sch.startTime,
        end: sch.endTime,
        summary: sch.title,
        description: sch.description ? `${sch.description}\nDanh mục: ${sch.category || 'N/A'}` : `Danh mục: ${sch.category || 'N/A'}`,
        location: sch.category || '',
      });
    });

    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="timetable.ics"',
    });

    res.end(calendar.toString());
  } catch (error: any) {
    handleControllerError(res, error, 'Export ICS error');
  }
};

/**
 * @desc    Public calendar feed — returns ICS for a user's feed token
 * @route   GET /api/schedules/feed/:token
 * @access  Public (no auth)
 */
export const getCalendarFeed = async (req: any, res: any): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({ message: 'Token is required' });
      return;
    }

    const user = await User.findOne({ calendarFeedToken: token }).select('_id username');
    if (!user) {
      res.status(404).json({ message: 'Invalid or expired feed token' });
      return;
    }

    const schedules = await Schedule.find({ createdBy: user._id });

    const calendar = ical({
      name: `${user.username} — Timetable`,
      method: ICalCalendarMethod.PUBLISH,
      prodId: { company: 'ManageTimetable', product: 'CalendarFeed' },
      ttl: 3600, // clients should refresh every hour
    });

    schedules.forEach((sch) => {
      const ev = calendar.createEvent({
        id: sch._id.toString(),
        start: sch.startTime,
        end: sch.endTime,
        summary: sch.title,
        description: sch.description || '',
        location: sch.category || '',
      });
      if ((sch as any).isAllDay) {
        ev.allDay(true);
      }
    });

    res.writeHead(200, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="feed.ics"',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(calendar.toString());
  } catch (error: any) {
    console.error('Calendar feed error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

