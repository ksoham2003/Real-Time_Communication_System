'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.emit('disconnect_user', user?._id);
        socket.disconnect();
        setSocket(null);
        setSocketConnected(false);
      }
      return;
    }

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketInstance.emit('setup', user);

    socketInstance.on('connected', () => {
      console.log('Socket client connected successfully');
      setSocketConnected(true);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit('disconnect_user', user._id);
      socketInstance.disconnect();
      setSocketConnected(false);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, socketConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
