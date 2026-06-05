import express from 'express';
import {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
} from '../controllers/chatController.js';
import protect from '../middlewares/authMiddleware.js';

const router = express.Router();

router.route('/').post(protect, accessChat).get(protect, fetchChats);
router.route('/group').post(protect, createGroupChat);
router.route('/group/rename').put(protect, renameGroup);
router.route('/group/add').put(protect, addToGroup);
router.route('/group/remove').put(protect, removeFromGroup);

export default router;
