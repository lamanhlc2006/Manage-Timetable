import { Router } from 'express';
import { registerUser, loginUser, getMe, logoutUser, updateProfile, changePassword } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);
router.patch('/profile', protect, updateProfile);
router.patch('/change-password', protect, changePassword);

export default router;
