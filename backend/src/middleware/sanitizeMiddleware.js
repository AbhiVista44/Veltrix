const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      if (BLOCKED_KEYS.has(key) || key.startsWith('$') || key.includes('.')) {
        continue;
      }
      cleaned[key] = sanitizeValue(val);
    }
    return cleaned;
  }

  return value;
};

/**
 * Express 5-safe middleware that strips MongoDB operator keys ($gt, $ne, etc.)
 * and prototype-pollution keys from req.body without mutating read-only req.query.
 */
export const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
};
