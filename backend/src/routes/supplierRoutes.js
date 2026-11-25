import { Router } from 'express';
import {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  getSuppliers,
  updateSupplier,
} from '../controllers/supplierController.js';

const router = Router();

router.route('/').get(getSuppliers).post(createSupplier);
router.route('/:id').get(getSupplierById).put(updateSupplier).delete(deleteSupplier);

export default router;
