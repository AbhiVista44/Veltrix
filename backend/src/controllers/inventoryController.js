import mongoose from 'mongoose';
import {
  LOSS_MOVEMENT_TYPES,
  MOVEMENT_TYPES,
  StockMovement,
} from '../models/StockMovement.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { applyStockMovement } from '../utils/inventoryService.js';
import {
  buildPaginationMeta,
  escapeRegex,
  parsePagination,
  parseSort,
} from '../utils/queryHelpers.js';
import {
  assertValidObjectId,
  validateStockMovementPayload,
} from '../utils/validators.js';

const ALLOWED_SORT_FIELDS = [
  'createdAt',
  'type',
  'quantity',
  'quantityDelta',
  'newQuantity',
  'totalValue',
];

const MOVEMENT_SUCCESS_LABELS = {
  stock_in: 'Stock-in recorded and quantity updated',
  stock_out: 'Stock-out recorded and quantity updated',
  adjustment: 'Stock adjustment recorded and quantity updated',
  damaged: 'Damaged stock recorded and deducted',
  expired: 'Expired stock recorded and deducted',
  wasted: 'Wasted stock recorded and deducted',
};

export const createStockMovement = asyncHandler(async (req, res) => {
  const payload = validateStockMovementPayload(req.body);
  if (req.user && !req.user.isGuestMode) {
    payload.performedBy = `${req.user.name} (${req.user.role})`;
  }
  const { product, movement } = await applyStockMovement(payload);

  res.status(201).json({
    success: true,
    message:
      MOVEMENT_SUCCESS_LABELS[payload.type] || 'Inventory movement recorded',
    data: {
      movement,
      product,
    },
  });
});

export const getStockMovements = asyncHandler(async (req, res) => {
  const filter = {};
  const { search, type, product, startDate, endDate } = req.query;

  if (type === 'loss') {
    filter.type = { $in: LOSS_MOVEMENT_TYPES };
  } else if (type && MOVEMENT_TYPES.includes(type)) {
    filter.type = type;
  }

  if (product) {
    assertValidObjectId(product, 'Product');
    filter.product = new mongoose.Types.ObjectId(product);
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        filter.createdAt.$gte = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate).trim())) {
          end.setUTCHours(23, 59, 59, 999);
        }
        filter.createdAt.$lte = end;
      }
    }
    if (Object.keys(filter.createdAt).length === 0) {
      delete filter.createdAt;
    }
  }

  if (typeof search === 'string' && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { 'productSnapshot.name': regex },
      { 'productSnapshot.sku': regex },
      { reason: regex },
      { reference: regex },
      { notes: regex },
      { performedBy: regex },
    ];
  }

  const { page, limit, skip } = parsePagination(req.query, 15, 100);
  const { sortObject } = parseSort(req.query, ALLOWED_SORT_FIELDS);

  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .populate('product', 'name sku unit quantity status')
      .sort(sortObject)
      .skip(skip)
      .limit(limit),
    StockMovement.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: buildPaginationMeta({ page, limit, total }),
  });
});

export const getInventorySummary = asyncHandler(async (_req, res) => {
  const [summaryAgg] = await StockMovement.aggregate([
    {
      $group: {
        _id: null,
        totalMovements: { $sum: 1 },
        stockInUnits: {
          $sum: { $cond: [{ $eq: ['$type', 'stock_in'] }, '$quantity', 0] },
        },
        stockOutUnits: {
          $sum: { $cond: [{ $eq: ['$type', 'stock_out'] }, '$quantity', 0] },
        },
        adjustmentCount: {
          $sum: { $cond: [{ $eq: ['$type', 'adjustment'] }, 1, 0] },
        },
        damagedUnits: {
          $sum: { $cond: [{ $eq: ['$type', 'damaged'] }, '$quantity', 0] },
        },
        expiredUnits: {
          $sum: { $cond: [{ $eq: ['$type', 'expired'] }, '$quantity', 0] },
        },
        wastedUnits: {
          $sum: { $cond: [{ $eq: ['$type', 'wasted'] }, '$quantity', 0] },
        },
        lossUnits: {
          $sum: {
            $cond: [{ $in: ['$type', LOSS_MOVEMENT_TYPES] }, '$quantity', 0],
          },
        },
        lossValue: {
          $sum: {
            $cond: [{ $in: ['$type', LOSS_MOVEMENT_TYPES] }, '$totalValue', 0],
          },
        },
      },
    },
  ]);

  const raw = summaryAgg || {};

  res.json({
    success: true,
    data: {
      totalMovements: raw.totalMovements || 0,
      stockInUnits: raw.stockInUnits || 0,
      stockOutUnits: raw.stockOutUnits || 0,
      adjustmentCount: raw.adjustmentCount || 0,
      damagedUnits: raw.damagedUnits || 0,
      expiredUnits: raw.expiredUnits || 0,
      wastedUnits: raw.wastedUnits || 0,
      lossUnits: raw.lossUnits || 0,
      lossValue: Number((raw.lossValue || 0).toFixed(2)),
    },
  });
});
