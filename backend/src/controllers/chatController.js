import Chat from '../models/Chat.js';
import User from '../models/User.js';

// @desc    Access or create a one-on-one chat
// @route   POST /api/chats
// @access  Private
export const accessChat = async (req, res, next) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    return next(new Error('UserId param not sent with request'));
  }

  try {
    // Find if 1-to-1 chat already exists between the two users
    let isChat = await Chat.find({
      isGroupChat: false,
      $and: [
        { users: { $elemMatch: { $eq: req.user._id } } },
        { users: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate('users', '-password')
      .populate('latestMessage');

    isChat = await User.populate(isChat, {
      path: 'latestMessage.sender',
      select: 'username avatar email status lastSeen',
    });

    if (isChat.length > 0) {
      res.send(isChat[0]);
    } else {
      // Create new chat
      const chatData = {
        chatName: 'sender',
        isGroupChat: false,
        users: [req.user._id, userId],
      };

      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        'users',
        '-password'
      );
      res.status(201).json(fullChat);
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Fetch all chats for current user
// @route   GET /api/chats
// @access  Private
export const fetchChats = async (req, res, next) => {
  try {
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate('users', '-password')
      .populate('groupAdmin', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: 'latestMessage.sender',
          select: 'username avatar email status lastSeen',
        });
        res.status(200).send(results);
      });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a group chat
// @route   POST /api/chats/group
// @access  Private
export const createGroupChat = async (req, res, next) => {
  if (!req.body.users || !req.body.name) {
    res.status(400);
    return next(new Error('Please fill all the fields'));
  }

  // Expecting a JSON string of user IDs array or raw array
  let users = req.body.users;
  if (typeof users === 'string') {
    try {
      users = JSON.parse(users);
    } catch (e) {
      res.status(400);
      return next(new Error('Invalid users format, must be array or JSON array'));
    }
  }

  if (users.length < 2) {
    res.status(400);
    return next(new Error('More than 2 users are required to form a group chat'));
  }

  // Add current logged-in user to the group
  users.push(req.user._id);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      groupAdmin: req.user._id,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.status(201).json(fullGroupChat);
  } catch (error) {
    next(error);
  }
};

// @desc    Rename a group chat
// @route   PUT /api/chats/group/rename
// @access  Private
export const renameGroup = async (req, res, next) => {
  const { chatId, chatName } = req.body;

  if (!chatId || !chatName) {
    res.status(400);
    return next(new Error('ChatId and new group name are required'));
  }

  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      { chatName },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    if (!updatedChat) {
      res.status(404);
      return next(new Error('Chat Not Found'));
    }

    res.json(updatedChat);
  } catch (error) {
    next(error);
  }
};

// @desc    Add a user to a group chat
// @route   PUT /api/chats/group/add
// @access  Private
export const addToGroup = async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    res.status(400);
    return next(new Error('ChatId and UserId are required'));
  }

  try {
    // Check if user is already in the group
    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404);
      return next(new Error('Chat Not Found'));
    }

    if (chat.users.includes(userId)) {
      res.status(400);
      return next(new Error('User is already in group'));
    }

    const added = await Chat.findByIdAndUpdate(
      chatId,
      { $push: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.json(added);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a user from a group chat / leave group
// @route   PUT /api/chats/group/remove
// @access  Private
export const removeFromGroup = async (req, res, next) => {
  const { chatId, userId } = req.body;

  if (!chatId || !userId) {
    res.status(400);
    return next(new Error('ChatId and UserId are required'));
  }

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      res.status(404);
      return next(new Error('Chat Not Found'));
    }

    // Optional: Only admin can remove people, but anyone can leave
    // If not leaving (i.e. req.user._id !== userId) and user is not admin
    if (chat.groupAdmin.toString() !== req.user._id.toString() && req.user._id.toString() !== userId.toString()) {
      res.status(403);
      return next(new Error('Only group admins can remove members'));
    }

    const removed = await Chat.findByIdAndUpdate(
      chatId,
      { $pull: { users: userId } },
      { new: true }
    )
      .populate('users', '-password')
      .populate('groupAdmin', '-password');

    res.json(removed);
  } catch (error) {
    next(error);
  }
};
