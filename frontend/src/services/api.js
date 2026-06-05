import axios from 'axios';

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token from localStorage on every request as a fallback
// (cross-origin cookies may be blocked by some browsers like Safari)
API.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('chatUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  }
  return config;
});

export default API;
