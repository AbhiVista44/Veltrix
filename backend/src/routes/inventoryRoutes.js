import { Router } from 'express';
import {
  createStockMovement,
  getInventorySummary,
  getStockMovements,
} from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/summary', getInventorySummary);
router.route('/movements').get(getStockMovements).post(createStockMovement);

export default router;
