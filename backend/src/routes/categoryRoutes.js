import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from '../controllers/categoryController.js';

const router = Router();

router.route('/').get(getCategories).post(createCategory);
router.route('/:id').get(getCategoryById).put(updateCategory).delete(deleteCategory);

export default router;
