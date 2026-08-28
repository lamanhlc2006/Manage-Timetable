import { Router } from 'express';
import { getTemplates, createTemplate, deleteTemplate, applyTemplate } from '../controllers/templateController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', protect, getTemplates);
router.post('/', protect, createTemplate);
router.delete('/:id', protect, deleteTemplate);
router.post('/:id/apply', protect, applyTemplate);

export default router;
