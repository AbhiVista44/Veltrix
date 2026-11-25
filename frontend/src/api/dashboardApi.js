import apiClient from './client.js';

export const getDashboardSummary = async () => {
  const { data } = await apiClient.get('/dashboard/summary');
  return data.data;
};

export const getHealthStatus = async () => {
  const { data } = await apiClient.get('/health');
  return data;
};
