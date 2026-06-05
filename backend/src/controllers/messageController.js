import Message from '../models/Message.js';
import User from '../models/User.js';
import Chat from '../models/Chat.js';

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  const { content, chatId, fileUrl } = req.body;

  if (!content || !chatId) {
    res.status(400);
    return next(new Error('Content and chatId are required'));
  }

  const newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    fileUrl: fileUrl || '',
    readBy: [req.user._id], // Sender reads it automatically
  };

  try {
    let message = await Message.create(newMessage);

    message = await message.populate('sender', 'username avatar email status lastSeen');
    message = await message.populate('chat');
    message = await User.populate(message, {
      path: 'chat.users',
      select: 'username avatar email status lastSeen',
    });

    // Update latest message in chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
export const allMessages = async (req, res, next) => {
  const { chatId } = req.params;

  if (!chatId) {
    res.status(400);
    return next(new Error('chatId parameter is required'));
  }

  try {
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'username avatar email status lastSeen')
      .populate('chat');
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res, next) => {
  const { messageId } = req.params;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      res.status(404);
      return next(new Error('Message not found'));
    }

    // Only sender can delete their message
    if (message.sender.toString() !== req.user._id.toString()) {
      res.status(403);
      return next(new Error('You can only delete your own messages'));
    }

    message.isDeleted = true;
    message.content = 'This message was deleted';
    await message.save();

    res.json(message);
  } catch (error) {
    next(error);
  }
};
