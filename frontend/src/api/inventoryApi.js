import apiClient from './client.js';

export const getInventorySummary = async () => {
  const { data } = await apiClient.get('/inventory/summary');
  return data.data;
};

export const getStockMovements = async (params = {}) => {
  const { data } = await apiClient.get('/inventory/movements', { params });
  return data;
};

export const createStockMovement = async (payload) => {
  const { data } = await apiClient.post('/inventory/movements', payload);
  return data;
};
