import { Router } from 'express';
import {
  createStockMovement,
  getInventorySummary,
  getStockMovements,
} from '../controllers/inventoryController.js';

const router = Router();

router.get('/summary', getInventorySummary);
router.route('/movements').get(getStockMovements).post(createStockMovement);

export default router;
