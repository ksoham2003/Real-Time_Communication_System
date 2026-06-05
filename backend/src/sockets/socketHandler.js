import User from '../models/User.js';
import Chat from '../models/Chat.js';

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('Connected to socket.io');

    // 1. Setup - register user ID room
    socket.on('setup', async (userData) => {
      if (!userData || !userData._id) return;
      socket.join(userData._id);
      console.log(`User ${userData._id} joined setup room`);

      // Update user status to online
      try {
        await User.findByIdAndUpdate(userData._id, {
          status: 'online',
          lastSeen: new Date(),
        });
        
        // Notify contacts/chats that this user is online
        socket.broadcast.emit('user_status_changed', {
          userId: userData._id,
          status: 'online',
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error('Error updating user online status:', err);
      }

      socket.emit('connected');
    });

    // 2. Join chat room
    socket.on('join_chat', (room) => {
      socket.join(room);
      console.log(`User joined room: ${room}`);
    });

    // 3. Leave chat room
    socket.on('leave_chat', (room) => {
      socket.leave(room);
      console.log(`User left room: ${room}`);
    });

    // 4. Typing indicators
    socket.on('typing', (room) => {
      socket.in(room).emit('typing', room);
    });

    socket.on('stop_typing', (room) => {
      socket.in(room).emit('stop_typing', room);
    });

    // 5. Send message
    socket.on('new_message', (newMessageReceived) => {
      const chat = newMessageReceived.chat;

      if (!chat || !chat.users) return console.log('chat.users not defined');

      chat.users.forEach((user) => {
        // Don't send the message back to the sender
        const userId = typeof user === 'object' ? user._id : user;
        if (userId === newMessageReceived.sender._id) return;

        socket.in(userId.toString()).emit('message_received', newMessageReceived);
      });
    });

    // 6. Message read event
    socket.on('message_read', async ({ chatId, userId }) => {
      if (!chatId || !userId) return;
      
      try {
        // Broadcast read receipt to other users in the chat room
        socket.in(chatId).emit('message_read', { chatId, userId });
      } catch (err) {
        console.error('Error handling message_read event:', err);
      }
    });

    // 7. Disconnect handler
    socket.on('disconnect_user', async (userId) => {
      if (!userId) return;
      console.log(`User ${userId} requested disconnect`);
      
      try {
        await User.findByIdAndUpdate(userId, {
          status: 'offline',
          lastSeen: new Date(),
        });

        io.emit('user_status_changed', {
          userId,
          status: 'offline',
          lastSeen: new Date(),
        });
      } catch (err) {
        console.error('Error setting offline status on request:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log('USER DISCONNECTED');
      // Note: Since standard socket disconnect event does not easily provide the userId,
      // we rely on the client emitting 'disconnect_user' before closing or we can match socket id
      // if we store it. Alternatively, in the Next.js frontend, we emit 'disconnect_user' during cleanup.
    });
  });
};

export default socketHandler;
