import apiClient from './client.js';

export const getCategories = async (params = {}) => {
  const { data } = await apiClient.get('/categories', { params });
  return data;
};

export const getAllCategories = async (status = 'active') => {
  const { data } = await apiClient.get('/categories', {
    params: { all: 'true', ...(status ? { status } : {}) },
  });
  return data.data || [];
};

export const createCategory = async (payload) => {
  const { data } = await apiClient.post('/categories', payload);
  return data;
};

export const updateCategory = async (id, payload) => {
  const { data } = await apiClient.put(`/categories/${id}`, payload);
  return data;
};

export const deleteCategory = async (id) => {
  const { data } = await apiClient.delete(`/categories/${id}`);
  return data;
};
