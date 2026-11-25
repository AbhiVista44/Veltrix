import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { ApiError } from './ApiError.js';
import {
  buildPaginationMeta,
  escapeRegex,
  parsePagination,
  parseSort,
} from './queryHelpers.js';

/**
 * Queries a master-data collection (Category or Supplier) along with
 * linked product counts, supporting search, status filter, sorting, and pagination.
 */
export const listWithProductCount = async ({
  Model,
  productForeignKey,
  searchFields,
  allowedSortFields,
  query,
  defaultSortField = 'createdAt',
  defaultSortOrder = 'desc',
}) => {
  const match = {};

  if (query.status && ['active', 'inactive'].includes(query.status)) {
    match.status = query.status;
  }

  const trimmedSearch = typeof query.search === 'string' ? query.search.trim() : '';
  if (trimmedSearch) {
    const regex = new RegExp(escapeRegex(trimmedSearch), 'i');
    match.$or = searchFields.map((field) => ({ [field]: regex }));
  }

  const { sortObject } = parseSort(
    query,
    allowedSortFields,
    defaultSortField,
    defaultSortOrder
  );

  // Return lightweight unpaginated list for form dropdowns
  if (query.all === 'true') {
    const items = await Model.find(match)
      .select('-normalizedName')
      .sort({ name: 1 })
      .lean();

    return { items, pagination: null };
  }

  const { page, limit, skip } = parsePagination(query, 10, 100);

  const [result] = await Model.aggregate([
    { $match: match },
    {
      $lookup: {
        from: Product.collection.name,
        localField: '_id',
        foreignField: productForeignKey,
        as: '_linkedProducts',
      },
    },
    {
      $addFields: {
        productCount: { $size: '$_linkedProducts' },
      },
    },
    {
      $project: {
        _linkedProducts: 0,
        normalizedName: 0,
      },
    },
    { $sort: sortObject },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    },
  ]);

  const total = result?.totalCount?.[0]?.count || 0;
  return {
    items: result?.items || [],
    pagination: buildPaginationMeta({ page, limit, total }),
  };
};

/**
 * Fetches a single master-data document alongside its linked product count.
 */
export const getByIdWithProductCount = async ({
  Model,
  id,
  productForeignKey,
  label,
}) => {
  const [doc, productCount] = await Promise.all([
    Model.findById(id).select('-normalizedName').lean(),
    Product.countDocuments({
      [productForeignKey]: new mongoose.Types.ObjectId(id),
    }),
  ]);

  if (!doc) {
    throw new ApiError(404, `${label} not found`);
  }

  return { ...doc, productCount };
};

/**
 * Guards against deleting a Category or Supplier that still has assigned products.
 */
export const ensureNoLinkedProducts = async ({
  id,
  productForeignKey,
  label,
}) => {
  const linkedCount = await Product.countDocuments({ [productForeignKey]: id });
  if (linkedCount > 0) {
    throw new ApiError(
      409,
      `Cannot delete this ${label.toLowerCase()} because ${linkedCount} product(s) are assigned to it.`
    );
  }
};
