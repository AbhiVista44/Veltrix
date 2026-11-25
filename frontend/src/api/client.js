import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
