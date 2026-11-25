import { Router } from 'express';
import {
  getAlertsAndReorders,
  getAnalyticsOverview,
  getNotifications,
  markNotificationsRead,
} from '../controllers/analyticsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect);

router.get('/overview', getAnalyticsOverview);
router.get('/alerts', getAlertsAndReorders);
router.get('/notifications', getNotifications);
router.post('/notifications/read', markNotificationsRead);

export default router;
