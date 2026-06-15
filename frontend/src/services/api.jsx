import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL ||'/api',
  headers: {
    'Content-Type': 'application/json',
  },
});
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';

    // A revoked center: sign the active session out immediately and carry the
    // super admin's message to the login screen.
    if (error.response?.status === 403 && error.response?.data?.centerRevoked) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.setItem('accessMessage', error.response.data.message || 'Access revoked.');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Auth/public flows handle their own 401s inline (wrong password, bad
    // verification code, fetching a center's campaigns before login). Redirecting
    // here would reload the page and wipe the error the user needs to read.
    const isAuthFlow =
      /\/auth\/(login|register)/.test(url) ||
      url.includes('/verification/') ||
      url.includes('/form-setup/center/campaigns');

    if (error.response?.status === 401 && !isAuthFlow) {
      const hadToken = !!localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only bounce a previously-authenticated session that has expired — never
      // an anonymous visitor on a public page.
      const path = window.location.pathname;
      const publicPaths = ['/login', '/signup', '/', '/pricing'];
      if (hadToken && !publicPaths.includes(path)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
