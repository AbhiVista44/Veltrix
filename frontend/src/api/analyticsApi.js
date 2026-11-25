import apiClient from './client.js';

export const getAnalyticsOverview = async (params = {}) => {
  const { data } = await apiClient.get('/analytics/overview', { params });
  return data.data;
};

export const getAlertsAndReorders = async (params = {}) => {
  const { data } = await apiClient.get('/analytics/alerts', { params });
  return data.data;
};

export const getNotifications = async () => {
  const { data } = await apiClient.get('/analytics/notifications');
  return data.data;
};

export const markNotificationsRead = async (keys = []) => {
  const { data } = await apiClient.post('/analytics/notifications/read', {
    keys,
  });
  return data;
};
