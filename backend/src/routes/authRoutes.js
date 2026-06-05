import express from 'express';
import {
  registerUser,
  authUser,
  getMyProfile,
  logoutUser,
} from '../controllers/userController.js';
import protect from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/me', protect, getMyProfile);
router.post('/logout', protect, logoutUser);

export default router;
