/**
 * Escapes special RegExp characters in user-provided search strings
 * to prevent regex errors or ReDoS attacks when querying MongoDB.
 */
export const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parses and clamps pagination query parameters.
 */
export const parsePagination = (query, defaultLimit = 10, maxLimit = 100) => {
  const rawPage = Number.parseInt(query.page, 10);
  const rawLimit = Number.parseInt(query.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, maxLimit)
      : defaultLimit;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

/**
 * Validates sort field against an explicit allowlist and builds a Mongoose sort object.
 */
export const parseSort = (
  query,
  allowedFields,
  defaultField = 'createdAt',
  defaultOrder = 'desc'
) => {
  const sortBy = allowedFields.includes(query.sortBy)
    ? query.sortBy
    : defaultField;
  const sortOrder =
    query.sortOrder === 'asc' || query.sortOrder === 'desc'
      ? query.sortOrder
      : defaultOrder;

  return {
    sortBy,
    sortOrder,
    sortObject: { [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: -1 },
  };
};

/**
 * Builds standard pagination metadata returned by list endpoints.
 */
export const buildPaginationMeta = ({ page, limit, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
  };
};
