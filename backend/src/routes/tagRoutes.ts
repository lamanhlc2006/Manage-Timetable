import { Router } from 'express';
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
} from '../controllers/tagController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', protect, getTags);
router.post('/', protect, createTag);
router.put('/:id', protect, updateTag);
router.delete('/:id', protect, deleteTag);

export default router;
