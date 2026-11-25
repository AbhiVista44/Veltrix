export const PRODUCT_UNITS = ['pcs', 'box', 'kg', 'g', 'ltr', 'pack', 'set'];

export const formatCurrency = (amount) => {
  const value = Number(amount || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value) =>
  new Intl.NumberFormat('en-US').format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

export const getStockStatus = (product) => {
  if (product.stockStatus) return product.stockStatus;
  if (product.quantity === 0) return 'out_of_stock';
  if (product.quantity <= product.reorderLevel) return 'low_stock';
  return 'in_stock';
};
