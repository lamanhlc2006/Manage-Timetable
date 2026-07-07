import { Router } from 'express';
import {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/scheduleController';
import { protect, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Retrieve all schedule events (Available to any authenticated user)
router.get('/', protect, getSchedules);

// CRUD modifications (Only accessible to administrators)
router.post('/', protect, isAdmin, createSchedule);
router.put('/:id', protect, isAdmin, updateSchedule);
router.delete('/:id', protect, isAdmin, deleteSchedule);

export default router;
