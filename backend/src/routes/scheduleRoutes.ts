import { Router } from 'express';
import {
  getSchedules,
  getUpcomingSchedules,
  importIcsSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  searchSchedules,
  exportIcs,
} from '../controllers/scheduleController';
import { protect, isAdmin } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validateMiddleware';
import { createScheduleSchema, updateScheduleSchema } from '../validations/scheduleValidation';

const router = Router();

// Retrieve all schedule events (Available to any authenticated user)
router.get('/', protect, getSchedules);

// Retrieve upcoming schedules in the next 24 hours
router.get('/upcoming', protect, getUpcomingSchedules);

// Bulk import schedule events from parsed .ics file
router.post('/import-ics', protect, importIcsSchedules);

// Export schedules to .ics file
router.get('/export/ics', protect, exportIcs);

// Search and filter schedule events
router.get('/search', protect, searchSchedules);

// CRUD modifications (Owner or Admin — authorization checked in controller)
router.post('/', protect, validate(createScheduleSchema), createSchedule);
router.put('/:id', protect, validate(updateScheduleSchema), updateSchedule);
router.patch('/:id', protect, validate(updateScheduleSchema), updateSchedule);
router.delete('/:id', protect, deleteSchedule);

export default router;
