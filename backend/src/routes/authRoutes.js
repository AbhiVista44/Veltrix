import { Router } from 'express';
import {
  changePassword,
  getAuthStatus,
  getMe,
  login,
  setupInitialAdmin,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/status', getAuthStatus);
router.post('/setup', setupInitialAdmin);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/password', protect, changePassword);

export default router;
