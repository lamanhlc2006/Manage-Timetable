import axios from 'axios';
import { message } from 'antd';
import { disconnectSocket } from './socketService';

axios.defaults.withCredentials = true;

// Create axios instance pointing to proxy path /api
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Add interceptor to automatically insert JWT token into headers if logged in
api.interceptors.request.use(
  (config) => {
    const userString = localStorage.getItem('user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        if (user && user.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch (error) {
        console.error('Error parsing user token', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRedirecting = false;
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Clears authentication state from localStorage, disconnects socket,
 * notifies app listeners and redirects user to /login page.
 */
export const clearAuthAndRedirect = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('offlineMode');

  try {
    disconnectSocket();
  } catch (e) {
    // Ignore socket error during logout cleanup
  }

  window.dispatchEvent(new CustomEvent('auth:unauthorized'));

  if (!isRedirecting && window.location.pathname !== '/login') {
    isRedirecting = true;
    window.location.href = '/login';
  }
};

// Response interceptor to gracefully catch 401 & 429 errors and handle Refresh Token Rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401) {
      // 1. Skip redirect for login & register endpoints (user entering wrong credentials)
      if (
        originalRequest?.url?.includes('/auth/login') ||
        originalRequest?.url?.includes('/auth/register')
      ) {
        return Promise.reject(error);
      }

      // 2. If refresh endpoint failed with 401 or retry already failed, clear auth & redirect
      if (originalRequest?.url?.includes('/auth/refresh') || originalRequest?._retry) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      if (!originalRequest) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            clearAuthAndRedirect();
            return Promise.reject(err);
          });
      }

      isRefreshing = true;

      try {
        const userString = localStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        
        // If there's no stored user info, clear auth & redirect
        if (!user) {
          throw new Error('No user session available');
        }

        // refreshToken is sent automatically via httpOnly cookie (withCredentials: true)
        const res = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        const newToken = res.data.token;

        user.token = newToken;
        localStorage.setItem('user', JSON.stringify(user));

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    } else if (error.response && error.response.status === 429) {
      message.warning(error.response.data?.message || 'Quá nhiều yêu cầu đến hệ thống. Vui lòng chờ giây lát!');
    }
    return Promise.reject(error);
  }
);

export default api;
