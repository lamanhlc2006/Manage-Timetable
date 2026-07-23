import { Router } from 'express';
import { getUsers, updateUserRole, toggleUserStatus, resetUserPassword } from '../controllers/userController';
import { protect, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

// All user management routes require both login and administrator rights
router.get('/', protect, isAdmin, getUsers);
router.put('/:id/role', protect, isAdmin, updateUserRole);
router.put('/:id/status', protect, isAdmin, toggleUserStatus);
router.post('/:id/reset-password', protect, isAdmin, resetUserPassword);

export default router;
