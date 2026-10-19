import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

// Request Interceptor: Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear invalid session
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const isAuthRoute =
        window.location.pathname === '/login' ||
        window.location.pathname === '/register';

      if (!isAuthRoute) {
        window.location.href = '/login?session_expired=true';
      }
    }

    const customError = {
      code: error.response?.data?.code || 'NETWORK_ERROR',
      message:
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred. Please try again.',
      errors: error.response?.data?.errors || null,
      status: error.response?.status || 500,
    };

    return Promise.reject(customError);
  }
);

export default api;
