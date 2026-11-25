import { Router } from 'express';
import {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  getSuppliers,
  updateSupplier,
} from '../controllers/supplierController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.route('/').get(getSuppliers).post(createSupplier);
router
  .route('/:id')
  .get(getSupplierById)
  .put(updateSupplier)
  .delete(requireRole('admin'), deleteSupplier);

export default router;
