import axios from 'axios';

// Create axios instance pointing to proxy path /api
const api = axios.create({
  baseURL: '/api',
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

export default api;
