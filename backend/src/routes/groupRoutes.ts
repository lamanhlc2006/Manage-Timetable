import { Router } from 'express';
import {
  createGroup,
  getMyGroups,
  updateGroup,
  deleteGroup,
  addMember,
  changeMemberRole,
  removeMember,
  getGroupSchedules,
} from '../controllers/groupController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', protect, getMyGroups);
router.post('/', protect, createGroup);
router.put('/:id', protect, updateGroup);
router.delete('/:id', protect, deleteGroup);

router.post('/:id/members', protect, addMember);
router.patch('/:id/members/:userId', protect, changeMemberRole);
router.delete('/:id/members/:userId', protect, removeMember);

router.get('/:id/schedules', protect, getGroupSchedules);

export default router;
