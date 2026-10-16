import axios from 'axios';
import { getCsrfToken, refreshCsrfToken } from './csrf';

if (typeof window !== 'undefined') {
  (window as any).axios = axios;
}

// Set common headers for all requests
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Request interceptor to attach fresh CSRF token
axios.interceptors.request.use((config) => {
  const token = getCsrfToken();
  if (token) {
    config.headers['X-CSRF-TOKEN'] = token;
  }
  return config;
});

// Response interceptor to handle 419 Page Expired errors on Axios calls
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 419 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const freshToken = await refreshCsrfToken();
        if (freshToken) {
          originalRequest.headers['X-CSRF-TOKEN'] = freshToken;
          return axios(originalRequest);
        }
      } catch (retryError) {
        console.debug('Failed to retry after CSRF refresh:', retryError);
      }
    }
    return Promise.reject(error);
  }
);

export default axios;