import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
  updateProfile,
  changePassword,
  refreshAccessToken,
} from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';

import {
  getGoogleAuthUrl,
  googleCallback,
  getGoogleSyncStatus,
  toggleGoogleSync,
  disconnectGoogle,
  syncGoogleNow,
} from '../controllers/googleAuthController';

import {
  generateFeedToken,
  revokeFeedToken,
} from '../controllers/authController';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);
router.patch('/change-password', protect, changePassword);

// Google OAuth & Google Calendar 2-Way Sync Routes
router.get('/google/url', protect, getGoogleAuthUrl);
router.get('/google/callback', googleCallback);
router.get('/google/status', protect, getGoogleSyncStatus);
router.post('/google/toggle-sync', protect, toggleGoogleSync);
router.post('/google/disconnect', protect, disconnectGoogle);
router.post('/google/sync-now', protect, syncGoogleNow);

// Calendar Feed Token
router.post('/generate-feed-token', protect, generateFeedToken);
router.delete('/revoke-feed-token', protect, revokeFeedToken);

export default router;
