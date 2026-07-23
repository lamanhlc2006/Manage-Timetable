import { Router } from 'express';
import {
  createFocusSession,
  getFocusSessions,
  getFocusStats,
} from '../controllers/focusSessionController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// All routes require authentication
router.use(protect);

router.post('/', createFocusSession);
router.get('/', getFocusSessions);
router.get('/stats', getFocusStats);

export default router;
