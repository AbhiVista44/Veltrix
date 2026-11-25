import apiClient from './client.js';

export const getSuppliers = async (params = {}) => {
  const { data } = await apiClient.get('/suppliers', { params });
  return data;
};

export const getAllSuppliers = async (status = 'active') => {
  const { data } = await apiClient.get('/suppliers', {
    params: { all: 'true', ...(status ? { status } : {}) },
  });
  return data.data || [];
};

export const createSupplier = async (payload) => {
  const { data } = await apiClient.post('/suppliers', payload);
  return data;
};

export const updateSupplier = async (id, payload) => {
  const { data } = await apiClient.put(`/suppliers/${id}`, payload);
  return data;
};

export const deleteSupplier = async (id) => {
  const { data } = await apiClient.delete(`/suppliers/${id}`);
  return data;
};
