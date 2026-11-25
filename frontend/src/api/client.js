import axios from 'axios';

export const AUTH_TOKEN_KEY = 'veltrix_token';

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/$/, '');
const baseURL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const apiClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    if (
      status === 401 &&
      !url.includes('/auth/login') &&
      !url.includes('/auth/setup')
    ) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.dispatchEvent(new Event('veltrix:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts a clean message and optional field-level errors from an Axios error.
 */
export const extractApiError = (error) => {
  const responseData = error?.response?.data;
  if (responseData) {
    return {
      message: responseData.message || 'Something went wrong. Please try again.',
      fieldErrors: responseData.errors || {},
      status: error.response.status,
    };
  }

  if (error?.request) {
    return {
      message: 'Unable to reach the server. Please verify the backend is running.',
      fieldErrors: {},
      status: 0,
    };
  }

  return {
    message: error?.message || 'Unexpected error occurred.',
    fieldErrors: {},
    status: 0,
  };
};

export default apiClient;
