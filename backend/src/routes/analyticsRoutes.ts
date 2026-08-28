import { Router } from 'express';
import { getAdvancedAnalytics } from '../controllers/analyticsController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/advanced', protect, getAdvancedAnalytics);

export default router;
