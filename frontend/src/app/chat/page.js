'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import API from '../../services/api';
import { useRouter } from 'next/navigation';
import {
  MessageSquare,
  Search,
  PlusCircle,
  LogOut,
  Send,
  Trash2,
  Users,
  X,
  UserCheck,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  ArrowLeft
} from 'lucide-react';

export default function ChatPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { socket, socketConnected } = useSocket();
  const router = useRouter();

  // Navigation / Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // States
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // Search users states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Group modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

  // Socket and typing states
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingChatId, setTypingChatId] = useState('');
  
  // Ref for auto scroll
  const messageEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Fetch all chats for sidebar
  const fetchMyChats = async () => {
    try {
      const { data } = await API.get('/chats');
      setChats(data);
    } catch (err) {
      console.error('Error fetching chats', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyChats();
    }
  }, [user]);

  // 2. Fetch messages for selected chat
  const fetchMessages = async (chatId) => {
    try {
      const { data } = await API.get(`/messages/${chatId}`);
      setMessages(data);
      // Mark chat messages as read
      socket?.emit('message_read', { chatId, userId: user._id });
    } catch (err) {
      console.error('Error fetching messages', err);
    }
  };

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
      socket?.emit('join_chat', selectedChat._id);
    }
    return () => {
      if (selectedChat) {
        socket?.emit('leave_chat', selectedChat._id);
      }
    };
  }, [selectedChat, socket]);

  // 3. Scroll to bottom of message list
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 4. Socket event listeners setup
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (newMessageReceived) => {
      // If message is for currently active chat, append it
      if (selectedChat && selectedChat._id === newMessageReceived.chat._id) {
        setMessages((prev) => [...prev, newMessageReceived]);
        // Send read receipt
        socket.emit('message_read', { chatId: selectedChat._id, userId: user._id });
      } else {
        // Increment unread count or refresh chat list
        fetchMyChats();
      }
    };

    const handleTyping = (room) => {
      if (selectedChat && selectedChat._id === room) {
        setIsTyping(true);
      }
    };

    const handleStopTyping = (room) => {
      if (selectedChat && selectedChat._id === room) {
        setIsTyping(false);
      }
    };

    const handleUserStatusChanged = ({ userId, status, lastSeen }) => {
      // Update the user status in sidebar chats lists
      setChats((prevChats) =>
        prevChats.map((chat) => {
          const updatedUsers = chat.users.map((u) =>
            u._id === userId ? { ...u, status, lastSeen } : u
          );
          return { ...chat, users: updatedUsers };
        })
      );
      
      // Update selected chat header if applicable
      if (selectedChat) {
        const updatedUsers = selectedChat.users.map((u) =>
          u._id === userId ? { ...u, status, lastSeen } : u
        );
        setSelectedChat((prev) => ({ ...prev, users: updatedUsers }));
      }
    };

    const handleMessageRead = ({ chatId, userId }) => {
      if (selectedChat && selectedChat._id === chatId) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) => {
            if (!msg.readBy.includes(userId)) {
              return { ...msg, readBy: [...msg.readBy, userId] };
            }
            return msg;
          })
        );
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('message_received', handleMessageReceived);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.off('message_read', handleMessageRead);
    };
  }, [socket, selectedChat, user]);

  // 5. Search users for 1-to-1 chat
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length === 0) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }
      try {
        const { data } = await API.get(`/users?search=${searchQuery}`);
        setSearchResults(data);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Error searching users', err);
      }
    };

    const delayDebounce = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // 6. Search users for Group creation
  useEffect(() => {
    const searchGroupUsers = async () => {
      if (groupSearchQuery.trim().length === 0) {
        setGroupSearchResults([]);
        return;
      }
      try {
        const { data } = await API.get(`/users?search=${groupSearchQuery}`);
        setGroupSearchResults(data);
      } catch (err) {
        console.error('Error searching users for group', err);
      }
    };

    const delayDebounce = setTimeout(() => {
      searchGroupUsers();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [groupSearchQuery]);

  // 7. Start/Select 1-on-1 Chat
  const handleSelectUser = async (userId) => {
    try {
      const { data } = await API.post('/chats', { userId });
      setSelectedChat(data);
      setSearchQuery('');
      setShowSearchResults(false);
      
      // Refresh chat list to show this chat
      fetchMyChats();
    } catch (err) {
      console.error('Error selecting user', err);
    }
  };

  // 8. Typing Handler
  const handleTypingInput = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected || !selectedChat) return;

    if (!typing) {
      setTyping(true);
      socket.emit('typing', selectedChat._id);
    }

    // Debounce to stop typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', selectedChat._id);
      setTyping(false);
    }, 2000);
  };

  // 9. Send Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !selectedChat) return;

    // Clear typing timeout and emit stop
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('stop_typing', selectedChat._id);
    setTyping(false);

    try {
      const messageContent = newMessage;
      setNewMessage(''); // optimistic clearing

      const { data } = await API.post('/messages', {
        content: messageContent,
        chatId: selectedChat._id,
      });

      // Emit new message socket event
      socket.emit('new_message', data);
      setMessages((prev) => [...prev, data]);
      
      // Update latest message in chat list
      fetchMyChats();
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  // 10. Soft Delete Message
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await API.delete(`/messages/${messageId}`);
      // Optimistically update locally
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, content: 'This message was deleted' }
            : msg
        )
      );
      // Emit to server to trigger general updates
      socket?.emit('new_message', {
        _id: messageId,
        chat: selectedChat,
        sender: user,
        isDeleted: true,
        content: 'This message was deleted',
      });
    } catch (err) {
      console.error('Error deleting message', err);
    }
  };

  // 11. Manage Group Selection
  const toggleSelectUserForGroup = (userSelect) => {
    if (selectedGroupUsers.find((u) => u._id === userSelect._id)) {
      setSelectedGroupUsers((prev) => prev.filter((u) => u._id !== userSelect._id));
    } else {
      setSelectedGroupUsers((prev) => [...prev, userSelect]);
    }
  };

  // 12. Create Group Chat
  const handleCreateGroup = async () => {
    if (!groupName || selectedGroupUsers.length < 2) {
      alert('Group name and at least 2 members are required');
      return;
    }

    try {
      const userIds = selectedGroupUsers.map((u) => u._id);
      const { data } = await API.post('/chats/group', {
        name: groupName,
        users: JSON.stringify(userIds),
      });

      setSelectedChat(data);
      setShowGroupModal(false);
      setGroupName('');
      setSelectedGroupUsers([]);
      setGroupSearchQuery('');
      setGroupSearchResults([]);
      
      fetchMyChats();
    } catch (err) {
      console.error('Error creating group chat', err);
    }
  };

  // Utility to format chat details
  const getSenderName = (chat) => {
    if (!chat) return '';
    if (chat.isGroupChat) return chat.chatName;
    const recipient = chat.users.find((u) => u._id !== user?._id);
    return recipient ? recipient.username : 'Deleted User';
  };

  const getSenderAvatar = (chat) => {
    if (!chat) return '';
    if (chat.isGroupChat) return `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.chatName)}&background=7c3aed&color=fff`;
    const recipient = chat.users.find((u) => u._id !== user?._id);
    return recipient ? recipient.avatar : 'https://ui-avatars.com/api/?name=Deleted';
  };

  const getRecipientStatus = (chat) => {
    if (!chat || chat.isGroupChat) return null;
    const recipient = chat.users.find((u) => u._id !== user?._id);
    return recipient ? recipient.status : 'offline';
  };

  const formatLastSeen = (chat) => {
    if (!chat || chat.isGroupChat) return '';
    const recipient = chat.users.find((u) => u._id !== user?._id);
    if (!recipient || recipient.status === 'online') return 'Online';
    if (!recipient.lastSeen) return 'Offline';
    
    const date = new Date(recipient.lastSeen);
    return `Last seen ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  };

  if (authLoading) {
    return (
      <div className="auth-container">
        <div className="typing-dots" style={{ scale: '1.5' }}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${selectedChat ? 'chat-active' : ''}`}>
      {/* 1. SIDEBAR */}
      <div className="sidebar">
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="user-profile-badge">
            <img src={user?.avatar} alt={user?.username} className="avatar" />
            <div className="user-info-name">{user?.username}</div>
          </div>
          <div className="sidebar-actions">
            <button
              className="icon-btn"
              title="Create Group Chat"
              onClick={() => setShowGroupModal(true)}
            >
              <PlusCircle size={20} />
            </button>
            <button
              className="icon-btn"
              title="Logout"
              onClick={logout}
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Sidebar Search Bar */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search users to start chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Sidebar Chat List / User Search Results */}
        <div className="chat-list">
          {showSearchResults ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                SEARCH RESULTS
              </div>
              {searchResults.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  No users found
                </div>
              ) : (
                searchResults.map((searchUser) => (
                  <div
                    key={searchUser._id}
                    className="chat-item"
                    onClick={() => handleSelectUser(searchUser._id)}
                  >
                    <div className="avatar-container">
                      <img src={searchUser.avatar} alt={searchUser.username} className="avatar" />
                      <div className={`status-indicator ${searchUser.status}`} />
                    </div>
                    <div className="chat-details">
                      <div className="chat-name">{searchUser.username}</div>
                      <div className="chat-snippet" style={{ color: 'var(--text-muted)' }}>
                        Click to start conversation
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              {chats.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', color: 'var(--text-secondary)', textAlign: 'center', gap: '0.5rem' }}>
                  <MessageSquare size={32} style={{ opacity: 0.2 }} />
                  <p style={{ fontSize: '0.9rem' }}>No conversations yet</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Search for users above to start a chat</p>
                </div>
              ) : (
                chats.map((chat) => {
                  const isActive = selectedChat && selectedChat._id === chat._id;
                  const isOnline = !chat.isGroupChat && getRecipientStatus(chat) === 'online';
                  
                  return (
                    <div
                      key={chat._id}
                      className={`chat-item ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <div className="avatar-container">
                        <img src={getSenderAvatar(chat)} alt={getSenderName(chat)} className="avatar" />
                        {!chat.isGroupChat && (
                          <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`} />
                        )}
                      </div>
                      <div className="chat-details">
                        <div className="chat-name-row">
                          <div className="chat-name">{getSenderName(chat)}</div>
                          <div className="chat-time">
                            {chat.latestMessage
                              ? new Date(chat.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
                          </div>
                        </div>
                        <div className="chat-snippet-row">
                          <div className="chat-snippet">
                            {chat.latestMessage
                              ? `${chat.latestMessage.sender._id === user._id ? 'You: ' : ''}${chat.latestMessage.content}`
                              : 'No messages yet'}
                          </div>
                          {/* Display dummy unread checkmark or indicator */}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>

      {/* 2. MAIN CHAT WINDOW */}
      <div className="chat-window">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-header-info">
                <button
                  type="button"
                  className="icon-btn back-btn"
                  title="Back to Chats"
                  onClick={() => setSelectedChat(null)}
                >
                  <ArrowLeft size={20} />
                </button>
                <img
                  src={getSenderAvatar(selectedChat)}
                  alt={getSenderName(selectedChat)}
                  className="avatar"
                />
                <div className="chat-header-details">
                  <h3>{getSenderName(selectedChat)}</h3>
                  <p>
                    {selectedChat.isGroupChat
                      ? `${selectedChat.users.length} members`
                      : formatLastSeen(selectedChat)}
                  </p>
                </div>
              </div>
              {selectedChat.isGroupChat && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <Users size={16} />
                  <span>Group</span>
                </div>
              )}
            </div>

            {/* Scrollable Message Feed */}
            <div className="message-area">
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <Smile size={32} style={{ opacity: 0.3 }} />
                  <p>Say hello to start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender._id === user._id;
                  const isRead = msg.readBy.length > 1; // More than just the sender read it
                  
                  return (
                    <div
                      key={msg._id}
                      className={`message-wrapper ${isMe ? 'sender' : 'receiver'}`}
                    >
                      {!isMe && selectedChat.isGroupChat && (
                        <div className="message-sender-name">{msg.sender.username}</div>
                      )}
                      <div className="message-bubble">
                        <span className={msg.isDeleted ? 'message-deleted' : ''}>
                          {msg.content}
                        </span>
                        
                        <div className="message-meta">
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && !msg.isDeleted && (
                            <span>
                              {isRead ? <CheckCheck size={14} color="#10b981" /> : <Check size={14} />}
                            </span>
                          )}
                        </div>

                        {/* Delete Button on Hover */}
                        {isMe && !msg.isDeleted && (
                          <div className="delete-btn-overlay">
                            <button
                              className="icon-btn"
                              title="Delete Message"
                              style={{ width: '28px', height: '28px', color: 'var(--error-color)' }}
                              onClick={() => handleDeleteMessage(msg._id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className="message-wrapper receiver">
                  <div className="message-bubble" style={{ background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <div className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messageEndRef} />
            </div>

            {/* Chat Input Area */}
            <form onSubmit={handleSendMessage} className="chat-input-area">
              <div className="chat-input-wrapper">
                <button
                  type="button"
                  className="icon-btn"
                  title="Attach file (Mockup)"
                  onClick={() => alert('File sharing is currently a placeholder')}
                >
                  <Paperclip size={20} />
                </button>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={handleTypingInput}
                />
                <button type="submit" className="icon-btn" style={{ color: 'var(--accent-color)' }} disabled={newMessage.trim() === ''}>
                  <Send size={20} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="chat-window-placeholder">
            <div className="placeholder-icon">
              <MessageSquare size={120} color="#7c3aed" />
            </div>
            <h2>Let's Start Chatting</h2>
            <p>Select a user or create a group from the sidebar to send messages instantly</p>
          </div>
        )}
      </div>

      {/* 3. GROUP CHAT CREATION MODAL */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Create Group Chat</h3>
              <button className="icon-btn" onClick={() => setShowGroupModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Search and Add Members (Min 2)</label>
                <div className="search-input-wrapper">
                  <Search size={14} className="search-icon" />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.25rem' }}
                    placeholder="Search members..."
                    value={groupSearchQuery}
                    onChange={(e) => setGroupSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Selected users badges list */}
              {selectedGroupUsers.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.25rem 0' }}>
                  {selectedGroupUsers.map((u) => (
                    <div
                      key={u._id}
                      style={{ background: 'var(--accent-bg)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem', border: '1px solid rgba(124, 58, 237, 0.3)' }}
                    >
                      <span>{u.username}</span>
                      <X size={12} style={{ cursor: 'pointer' }} onClick={() => toggleSelectUserForGroup(u)} />
                    </div>
                  ))}
                </div>
              )}

              {/* Search results select list */}
              {groupSearchResults.length > 0 && (
                <div className="multi-select-list">
                  {groupSearchResults.map((searchUser) => {
                    const isSelected = selectedGroupUsers.find((u) => u._id === searchUser._id);
                    return (
                      <div
                        key={searchUser._id}
                        className={`select-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSelectUserForGroup(searchUser)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <img src={searchUser.avatar} alt={searchUser.username} className="avatar" style={{ width: '30px', height: '30px' }} />
                          <span style={{ fontSize: '0.9rem' }}>{searchUser.username}</span>
                        </div>
                        {isSelected && <UserCheck size={16} color="#7c3aed" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowGroupModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateGroup}
                disabled={!groupName || selectedGroupUsers.length < 2}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
