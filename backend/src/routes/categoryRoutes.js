import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from '../controllers/categoryController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.route('/').get(getCategories).post(createCategory);
router
  .route('/:id')
  .get(getCategoryById)
  .put(updateCategory)
  .delete(requireRole('admin'), deleteCategory);

export default router;
