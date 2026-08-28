import { Router } from 'express';
import {
  createShareLink,
  getMyShareLinks,
  deleteShareLink,
  getSharedCalendar,
} from '../controllers/shareController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Public: access shared calendar
router.get('/:token', getSharedCalendar);

// Private: manage share links
router.post('/create', protect, createShareLink);
router.get('/my-links/list', protect, getMyShareLinks);
router.delete('/:id', protect, deleteShareLink);

export default router;
