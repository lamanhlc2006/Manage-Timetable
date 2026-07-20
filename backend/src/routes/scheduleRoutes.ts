import { Router } from 'express';
import {
  getSchedules,
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

// Export schedules to .ics file
router.get('/export/ics', protect, exportIcs);

// Search and filter schedule events
router.get('/search', protect, searchSchedules);

// CRUD modifications (Only accessible to administrators)
router.post('/', protect, isAdmin, validate(createScheduleSchema), createSchedule);
router.put('/:id', protect, isAdmin, validate(updateScheduleSchema), updateSchedule);
router.patch('/:id', protect, isAdmin, validate(updateScheduleSchema), updateSchedule);
router.delete('/:id', protect, isAdmin, deleteSchedule);

export default router;
