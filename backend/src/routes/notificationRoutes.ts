import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getVapidPublicKey,
  subscribeWebPush,
  unsubscribeWebPush,
} from '../controllers/notificationController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/vapid-public-key', getVapidPublicKey);
router.post('/subscribe', protect, subscribeWebPush);
router.post('/unsubscribe', protect, unsubscribeWebPush);

router.get('/', protect, getNotifications);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

export default router;
