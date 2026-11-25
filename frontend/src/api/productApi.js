import apiClient from './client.js';

export const getProducts = async (params = {}) => {
  const { data } = await apiClient.get('/products', { params });
  return data;
};

export const getProductById = async (id) => {
  const { data } = await apiClient.get(`/products/${id}`);
  return data;
};

export const createProduct = async (payload) => {
  const { data } = await apiClient.post('/products', payload);
  return data;
};

export const updateProduct = async (id, payload) => {
  const { data } = await apiClient.put(`/products/${id}`, payload);
  return data;
};

export const deleteProduct = async (id) => {
  const { data } = await apiClient.delete(`/products/${id}`);
  return data;
};
