import express from 'express';
import {
  sendMessage,
  allMessages,
  deleteMessage,
} from '../controllers/messageController.js';
import protect from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, sendMessage);
router.route('/:chatId').get(protect, allMessages);
router.route('/:messageId').delete(protect, deleteMessage);

export default router;
