# Real-Time One-to-One & Group Chat Application

A high-performance real-time messaging application designed with a decoupled architecture. Built using **Node.js/Express** and **Socket.IO** for the backend server, **MongoDB** (Mongoose) for database persistence, and **Next.js** for a premium glassmorphic user interface.

## Core Features
- **User Authentication**: JWT-based login and signup system with cookies and protected routing.
- **One-to-One Chats**: Private real-time messaging using Socket.IO rooms.
- **Group Chats**: Dynamic group chat creation with multi-user selection and room management.
- **Real-Time Sockets**:
  - Instant bi-directional message delivery.
  - Active typing indicators.
  - Read receipts (checkmark status changes).
  - Online/Offline user sync & status indicators.
- **Message Controls**: Ability to soft-delete messages (sender-only permission).
- **Aesthetic UI**: Smooth custom animations, custom scrollbars, and dark glassmorphic styling.

---

## Folder Structure

```
Real-Time_Communication_System/
├── backend/
│   ├── src/
│   │   ├── config/          # DB config, generate JWT token helper
│   │   ├── models/          # Schemas (User, Chat, Message)
│   │   ├── controllers/     # Express route controller logic
│   │   ├── routes/          # API endpoints definition
│   │   ├── middlewares/     # JWT protection & Error handlers
│   │   └── sockets/         # Socket.IO connection event logic
│   ├── package.json
│   └── .env
└── frontend/
    ├── src/
    │   ├── app/             # App router pages (layout, pages, login, register, chat)
    │   ├── context/         # AuthContext, SocketContext providers
    │   ├── services/        # Axios API client wrapper
    │   └── styles/          # Styling configurations (globals.css)
    └── package.json
```

---

## Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [MongoDB](https://www.mongodb.com/) (Local service or Atlas instance)

### 1. Database Setup
Make sure MongoDB is running locally on:
```bash
mongodb://127.0.0.1:27017/chat-app
```
*(Or modify the database URI inside `backend/.env` to point to a MongoDB Atlas cluster).*

### 2. Backend Server Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Set up the environment variables:
   A `.env` file has been pre-configured, but you can reference `.env.example` to ensure correct variables are set:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/chat-app
   JWT_SECRET=supersecretjwtkey123456
   CLIENT_URL=http://localhost:3000
   NODE_ENV=development
   ```
4. Start the development server (runs backend on port `5000`):
   ```bash
   npm run dev
   ```

### 3. Frontend Client Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Next.js development server (runs frontend on port `3000`):
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser to start chatting!

---

## API Documentation

### Auth APIs
- `POST /api/auth/register` - Registers a new user. Registers session cookies.
- `POST /api/auth/login` - Logs in a user. Registers session cookies.
- `GET /api/auth/me` - Resolves currently logged-in user profile.
- `POST /api/auth/logout` - Clears cookie session.

### Users APIs
- `GET /api/users?search=query` - Search other users by email or username to start a new chat.

### Chat Management APIs
- `POST /api/chats` - Creates or fetches a 1-to-1 conversation with another user.
- `GET /api/chats` - Fetches all conversations of the logged-in user.
- `POST /api/chats/group` - Creates a group chat.
- `PUT /api/chats/group/rename` - Renames group chat.
- `PUT /api/chats/group/add` - Adds a user to group.
- `PUT /api/chats/group/remove` - Removes a user or leaves group.

### Message APIs
- `POST /api/messages` - Sends a message inside a chat room.
- `GET /api/messages/:chatId` - Returns complete message logs for a chat.
- `DELETE /api/messages/:messageId` - Soft-deletes a message (marks `isDeleted` as true).

---

## Socket.IO Events Reference

| Event Name | Type | Description |
|---|---|---|
| `setup` | Inbound | Registers user ID to its own socket room for notifications. Updates database status to online. |
| `connected` | Outbound | Acknowledges socket connection setup. |
| `join_chat` | Inbound | Subscribes socket to the selected chat room. |
| `leave_chat` | Inbound | Unsubscribes socket from the chat room. |
| `new_message` | Inbound | Delivers text message to room members. |
| `message_received`| Outbound | Dispatches message payload to other room members. |
| `typing` | Bidirectional| Manages and displays typing status bubble. |
| `stop_typing` | Bidirectional| Removes typing status bubble. |
| `user_status_changed`| Outbound | Broadcasts online/offline status updates to active chats. |
| `message_read` | Bidirectional| Manages read receipts and checkmarks status. |
