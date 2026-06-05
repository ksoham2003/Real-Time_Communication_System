'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../services/api';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('chatUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Error parsing stored user data', err);
      }
    }
    
    // Fetch profile from backend to verify validity
    const checkAuthStatus = async () => {
      try {
        const { data } = await API.get('/auth/me');
        setUser(data);
        localStorage.setItem('chatUser', JSON.stringify(data));
      } catch (err) {
        console.log('User session not active, clearing local storage.');
        setUser(null);
        localStorage.removeItem('chatUser');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);

  const login = async (usernameOrEmail, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post('/auth/login', { usernameOrEmail, password });
      setUser(data);
      localStorage.setItem('chatUser', JSON.stringify(data));
      router.push('/chat');
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed, check credentials';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await API.post('/auth/register', { username, email, password });
      setUser(data);
      localStorage.setItem('chatUser', JSON.stringify(data));
      router.push('/chat');
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed, email or username may be taken';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await API.post('/auth/logout');
    } catch (err) {
      console.error('Backend logout failed', err);
    } finally {
      setUser(null);
      localStorage.removeItem('chatUser');
      setLoading(false);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout, setUser, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
