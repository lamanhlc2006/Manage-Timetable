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

// Response interceptor to gracefully catch 401 & 429 errors

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!isRedirecting) {
        isRedirecting = true;
        localStorage.removeItem('user');
        localStorage.removeItem('offlineMode');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        setTimeout(() => {
          isRedirecting = false;
        }, 3000);
      }
    } else if (error.response && error.response.status === 429) {
      message.warning(error.response.data?.message || 'Quá nhiều yêu cầu đến hệ thống. Vui lòng chờ giây lát!');
    }
    return Promise.reject(error);
  }
);

export default api;
