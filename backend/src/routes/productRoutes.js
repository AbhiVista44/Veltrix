import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct,
} from '../controllers/productController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.route('/').get(getProducts).post(createProduct);
router
  .route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(requireRole('admin'), deleteProduct);

export default router;
