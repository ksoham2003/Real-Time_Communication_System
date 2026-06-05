import express from 'express';
import { allUsers } from '../controllers/userController.js';
import protect from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', protect, allUsers);

export default router;
