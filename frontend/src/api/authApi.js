import apiClient from './client.js';

export const getAuthStatus = async () => {
  const { data } = await apiClient.get('/auth/status');
  return data.data;
};

export const setupInitialAdmin = async (payload) => {
  const { data } = await apiClient.post('/auth/setup', payload);
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await apiClient.post('/auth/login', payload);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await apiClient.get('/auth/me');
  return data.data;
};

export const changePassword = async (payload) => {
  const { data } = await apiClient.put('/auth/password', payload);
  return data;
};

export const getUsers = async (params = {}) => {
  const { data } = await apiClient.get('/users', { params });
  return data;
};

export const createUser = async (payload) => {
  const { data } = await apiClient.post('/users', payload);
  return data;
};

export const updateUser = async (id, payload) => {
  const { data } = await apiClient.patch(`/users/${id}`, payload);
  return data;
};
