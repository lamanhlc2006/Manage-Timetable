import axios from 'axios';
import { message } from 'antd';

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

// Response interceptor to gracefully catch 401 & 429 errors and handle Refresh Token Rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      // Skip refresh for auth endpoints themselves
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
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
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const userString = localStorage.getItem('user');
        const user = userString ? JSON.parse(userString) : null;
        
        // If there's no stored user, don't attempt refresh
        if (!user || !user.refreshToken) {
          throw new Error('No refresh token available');
        }

        const res = await axios.post(
          '/api/auth/refresh',
          { refreshToken: user.refreshToken },
          { withCredentials: true }
        );

        const newToken = res.data.token;
        const newRefreshToken = res.data.refreshToken;

        user.token = newToken;
        if (newRefreshToken) user.refreshToken = newRefreshToken;
        localStorage.setItem('user', JSON.stringify(user));

        api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        
        // Clear local auth storage when session is expired
        if (localStorage.getItem('user')) {
          localStorage.removeItem('user');
          localStorage.removeItem('offlineMode');
          // Dispatch custom event for React Router to handle redirection without page reload
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

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
