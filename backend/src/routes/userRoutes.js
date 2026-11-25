import { Router } from 'express';
import {
  createUser,
  getUsers,
  updateUser,
} from '../controllers/userController.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

router.use(protect, requireRole('admin'));

router.route('/').get(getUsers).post(createUser);
router.patch('/:id', updateUser);

export default router;
