import { Response } from 'express';
import { Schedule } from '../models/Schedule';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * @desc    Get all schedules
 * @route   GET /api/schedules
 * @access  Private (Registered users)
 */
export const getSchedules = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Populate createdBy to get user profile details if needed
    const schedules = await Schedule.find({}).populate('createdBy', 'username email role');
    res.json(schedules);
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
  const { title, description, startTime, endTime, color } = req.body;

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

    const newSchedule = await Schedule.create({
      title,
      description,
      startTime: start,
      endTime: end,
      color,
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
  const { title, description, startTime, endTime, color } = req.body;

  try {
    const schedule = await Schedule.findById(id);

    if (!schedule) {
      res.status(404).json({ message: 'Schedule event not found' });
      return;
    }

    // Prepare update object
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;

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

    if (startTime !== undefined) updateData.startTime = start;
    if (endTime !== undefined) updateData.endTime = end;

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
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

  try {
    const schedule = await Schedule.findById(id);

    if (!schedule) {
      res.status(404).json({ message: 'Schedule event not found' });
      return;
    }

    await Schedule.findByIdAndDelete(id);

    res.json({ message: 'Schedule event removed successfully', id });
  } catch (error: any) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
