import mongoose from 'mongoose';
import { Category } from '../models/Category.js';
import { NotificationRead } from '../models/NotificationRead.js';
import { Product } from '../models/Product.js';
import { LOSS_MOVEMENT_TYPES, StockMovement } from '../models/StockMovement.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { escapeRegex } from '../utils/queryHelpers.js';
import { assertValidObjectId } from '../utils/validators.js';

const buildProductFilter = ({ category, supplier }) => {
  const filter = {};
  if (category) {
    assertValidObjectId(category, 'Category');
    filter.category = new mongoose.Types.ObjectId(category);
  }
  if (supplier) {
    assertValidObjectId(supplier, 'Supplier');
    filter.supplier = new mongoose.Types.ObjectId(supplier);
  }
  return filter;
};

const formatShortDate = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const buildUtcDateWindow = (days) => {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1), 0, 0, 0, 0)
  );

  const dateKeys = [];
  for (let i = 0; i < days; i += 1) {
    const cursor = new Date(start.getTime() + i * 86400000);
    dateKeys.push(cursor.toISOString().slice(0, 10));
  }

  return { start, end, dateKeys };
};

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const rawDays = Number.parseInt(req.query.days, 10);
  const days = [7, 14, 30, 90].includes(rawDays) ? rawDays : 30;
  const productFilter = buildProductFilter(req.query);
  const hasProductScope = Object.keys(productFilter).length > 0;

  const { start, end, dateKeys } = buildUtcDateWindow(days);

  const scopedProductIds = hasProductScope
    ? await Product.find(productFilter).distinct('_id')
    : null;

  const movementMatch = {
    createdAt: { $gte: start, $lte: end },
    ...(scopedProductIds ? { product: { $in: scopedProductIds } } : {}),
  };

  const [
    valuationAgg,
    topValuedRaw,
    categoryInsightsRaw,
    dailyMovementsRaw,
    movementSummaryRaw,
  ] = await Promise.all([
    Product.aggregate([
      { $match: productFilter },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          totalUnits: { $sum: '$quantity' },
          totalValuation: { $sum: { $multiply: ['$price', '$quantity'] } },
          inStockCount: {
            $sum: { $cond: [{ $gt: ['$quantity', '$reorderLevel'] }, 1, 0] },
          },
          lowStockCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$quantity', 0] },
                    { $lte: ['$quantity', '$reorderLevel'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] },
          },
          inStockValuation: {
            $sum: {
              $cond: [
                { $gt: ['$quantity', '$reorderLevel'] },
                { $multiply: ['$price', '$quantity'] },
                0,
              ],
            },
          },
          lowStockValuation: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ['$quantity', 0] },
                    { $lte: ['$quantity', '$reorderLevel'] },
                  ],
                },
                { $multiply: ['$price', '$quantity'] },
                0,
              ],
            },
          },
        },
      },
    ]),
    Product.aggregate([
      { $match: productFilter },
      {
        $addFields: {
          valuation: { $multiply: ['$price', '$quantity'] },
        },
      },
      { $sort: { valuation: -1, quantity: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: Category.collection.name,
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDoc',
        },
      },
      {
        $project: {
          name: 1,
          sku: 1,
          price: 1,
          quantity: 1,
          unit: 1,
          reorderLevel: 1,
          valuation: { $round: ['$valuation', 2] },
          categoryName: {
            $ifNull: [{ $arrayElemAt: ['$categoryDoc.name', 0] }, 'Uncategorized'],
          },
        },
      },
    ]),
    Category.aggregate([
      ...(productFilter.category
        ? [{ $match: { _id: productFilter.category } }]
        : []),
      {
        $lookup: {
          from: Product.collection.name,
          let: { catId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$category', '$$catId'] },
                ...(productFilter.supplier
                  ? { supplier: productFilter.supplier }
                  : {}),
              },
            },
          ],
          as: 'products',
        },
      },
      {
        $project: {
          name: 1,
          status: 1,
          productCount: { $size: '$products' },
          totalUnits: { $sum: '$products.quantity' },
          totalValuation: {
            $round: [
              {
                $sum: {
                  $map: {
                    input: '$products',
                    as: 'p',
                    in: { $multiply: ['$$p.price', '$$p.quantity'] },
                  },
                },
              },
              2,
            ],
          },
          lowStockCount: {
            $size: {
              $filter: {
                input: '$products',
                as: 'p',
                cond: {
                  $and: [
                    { $gt: ['$$p.quantity', 0] },
                    { $lte: ['$$p.quantity', '$$p.reorderLevel'] },
                  ],
                },
              },
            },
          },
          outOfStockCount: {
            $size: {
              $filter: {
                input: '$products',
                as: 'p',
                cond: { $eq: ['$$p.quantity', 0] },
              },
            },
          },
        },
      },
      { $sort: { totalValuation: -1, productCount: -1, name: 1 } },
    ]),
    StockMovement.aggregate([
      { $match: movementMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          stockIn: {
            $sum: { $cond: [{ $eq: ['$type', 'stock_in'] }, '$quantity', 0] },
          },
          stockOut: {
            $sum: { $cond: [{ $eq: ['$type', 'stock_out'] }, '$quantity', 0] },
          },
          loss: {
            $sum: {
              $cond: [{ $in: ['$type', LOSS_MOVEMENT_TYPES] }, '$quantity', 0],
            },
          },
          adjustmentNet: {
            $sum: {
              $cond: [{ $eq: ['$type', 'adjustment'] }, '$quantityDelta', 0],
            },
          },
          stockInValue: {
            $sum: { $cond: [{ $eq: ['$type', 'stock_in'] }, '$totalValue', 0] },
          },
          stockOutValue: {
            $sum: { $cond: [{ $eq: ['$type', 'stock_out'] }, '$totalValue', 0] },
          },
        },
      },
    ]),
    StockMovement.aggregate([
      { $match: movementMatch },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          units: { $sum: '$quantity' },
          value: { $sum: '$totalValue' },
        },
      },
    ]),
  ]);

  const rawVal = valuationAgg[0] || {};
  const totalValuation = Number((rawVal.totalValuation || 0).toFixed(2));
  const totalUnits = rawVal.totalUnits || 0;

  const dailyByDate = new Map(dailyMovementsRaw.map((row) => [row._id, row]));
  const stockTrends = dateKeys.map((dateKey) => {
    const row = dailyByDate.get(dateKey);
    const stockIn = row?.stockIn || 0;
    const stockOut = row?.stockOut || 0;
    const loss = row?.loss || 0;
    const adjustmentNet = row?.adjustmentNet || 0;
    return {
      date: dateKey,
      label: formatShortDate(dateKey),
      stockIn,
      stockOut,
      loss,
      netChange: stockIn - stockOut - loss + adjustmentNet,
      stockInValue: Number((row?.stockInValue || 0).toFixed(2)),
      stockOutValue: Number((row?.stockOutValue || 0).toFixed(2)),
    };
  });

  const categoryInsights = categoryInsightsRaw.map((cat) => ({
    ...cat,
    sharePercent:
      totalValuation > 0
        ? Number(((cat.totalValuation / totalValuation) * 100).toFixed(1))
        : 0,
  }));

  const movementBreakdown = movementSummaryRaw.map((entry) => ({
    type: entry._id,
    count: entry.count,
    units: entry.units,
    value: Number((entry.value || 0).toFixed(2)),
  }));

  res.json({
    success: true,
    data: {
      days,
      valuation: {
        totalProducts: rawVal.totalProducts || 0,
        activeProducts: rawVal.activeProducts || 0,
        totalUnits,
        totalValuation,
        averageUnitValue:
          totalUnits > 0 ? Number((totalValuation / totalUnits).toFixed(2)) : 0,
        inStockCount: rawVal.inStockCount || 0,
        lowStockCount: rawVal.lowStockCount || 0,
        outOfStockCount: rawVal.outOfStockCount || 0,
        inStockValuation: Number((rawVal.inStockValuation || 0).toFixed(2)),
        lowStockValuation: Number((rawVal.lowStockValuation || 0).toFixed(2)),
      },
      stockTrends,
      categoryInsights,
      topValuedProducts: topValuedRaw,
      movementBreakdown,
    },
  });
});

export const getAlertsAndReorders = asyncHandler(async (req, res) => {
  const { severity, category, supplier, search, status } = req.query;
  const filter = {
    $expr: { $lte: ['$quantity', '$reorderLevel'] },
  };

  if (severity === 'out_of_stock') {
    filter.quantity = 0;
  } else if (severity === 'low_stock') {
    filter.$expr = {
      $and: [
        { $gt: ['$quantity', 0] },
        { $lte: ['$quantity', '$reorderLevel'] },
      ],
    };
  }

  if (category) {
    assertValidObjectId(category, 'Category');
    filter.category = new mongoose.Types.ObjectId(category);
  }
  if (supplier) {
    assertValidObjectId(supplier, 'Supplier');
    filter.supplier = new mongoose.Types.ObjectId(supplier);
  }
  if (status && ['active', 'inactive'].includes(status)) {
    filter.status = status;
  }
  if (typeof search === 'string' && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: regex }, { sku: regex }];
  }

  const alertedProducts = await Product.find(filter)
    .populate('category', 'name')
    .populate('supplier', 'name contactPerson email phone')
    .sort({ quantity: 1, reorderLevel: -1, name: 1 })
    .lean();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const productIds = alertedProducts.map((p) => p._id);

  const outflowRows =
    productIds.length > 0
      ? await StockMovement.aggregate([
          {
            $match: {
              product: { $in: productIds },
              type: { $in: ['stock_out', ...LOSS_MOVEMENT_TYPES] },
              createdAt: { $gte: thirtyDaysAgo },
            },
          },
          {
            $group: {
              _id: '$product',
              recentOutflow: { $sum: '$quantity' },
            },
          },
        ])
      : [];

  const outflowMap = new Map(
    outflowRows.map((r) => [String(r._id), r.recentOutflow])
  );

  let outOfStockCount = 0;
  let lowStockCount = 0;
  let totalSuggestedUnits = 0;
  let totalEstimatedRestockCost = 0;

  const alerts = alertedProducts.map((product) => {
    const stockStatus = product.quantity === 0 ? 'out_of_stock' : 'low_stock';
    if (stockStatus === 'out_of_stock') {
      outOfStockCount += 1;
    } else {
      lowStockCount += 1;
    }

    const recent30dOutflow = outflowMap.get(String(product._id)) || 0;
    const targetStock = Math.max(
      product.reorderLevel * 2,
      product.reorderLevel + Math.ceil(recent30dOutflow * 0.5),
      product.reorderLevel + 5
    );
    const suggestedOrderQty = Math.max(1, targetStock - product.quantity);
    const estimatedRestockCost = Number(
      (suggestedOrderQty * Number(product.price || 0)).toFixed(2)
    );

    totalSuggestedUnits += suggestedOrderQty;
    totalEstimatedRestockCost += estimatedRestockCost;

    let urgency = 'medium';
    if (product.quantity === 0) {
      urgency = 'critical';
    } else if (product.quantity <= Math.floor(product.reorderLevel / 2)) {
      urgency = 'high';
    }

    return {
      ...product,
      stockStatus,
      urgency,
      deficit: Math.max(0, product.reorderLevel - product.quantity),
      recent30dOutflow,
      suggestedOrderQty,
      estimatedRestockCost,
    };
  });

  res.json({
    success: true,
    data: {
      summary: {
        totalAlerts: alerts.length,
        outOfStockCount,
        lowStockCount,
        totalSuggestedUnits,
        totalEstimatedRestockCost: Number(totalEstimatedRestockCost.toFixed(2)),
      },
      alerts,
    },
  });
});

export const getNotifications = asyncHandler(async (_req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const [alertProducts, recentLosses, readDocs] = await Promise.all([
    Product.find({
      status: 'active',
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    })
      .select('name sku quantity reorderLevel unit updatedAt')
      .sort({ quantity: 1, updatedAt: -1 })
      .limit(20)
      .lean(),
    StockMovement.find({
      type: { $in: LOSS_MOVEMENT_TYPES },
      createdAt: { $gte: sevenDaysAgo },
    })
      .select('productSnapshot type quantity totalValue reason createdAt')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    NotificationRead.find().select('notificationKey').lean(),
  ]);

  const readKeys = new Set(readDocs.map((d) => d.notificationKey));

  const stockNotifications = alertProducts.map((product) => {
    const isOut = product.quantity === 0;
    const key = `${isOut ? 'out_of_stock' : 'low_stock'}:${product._id}`;
    return {
      id: key,
      type: isOut ? 'out_of_stock' : 'low_stock',
      severity: isOut ? 'critical' : 'warning',
      title: isOut
        ? `Out of stock: ${product.name}`
        : `Low stock alert: ${product.name}`,
      message: isOut
        ? `${product.sku} has 0 ${product.unit} remaining (reorder level: ${product.reorderLevel}).`
        : `${product.sku} has ${product.quantity} ${product.unit} left (reorder at ${product.reorderLevel}).`,
      link: `/alerts?severity=${isOut ? 'out_of_stock' : 'low_stock'}`,
      createdAt: product.updatedAt,
      isRead: readKeys.has(key),
    };
  });

  const lossNotifications = recentLosses.map((mov) => {
    const key = `loss:${mov._id}`;
    return {
      id: key,
      type: 'inventory_loss',
      severity: 'info',
      title: `${mov.type.charAt(0).toUpperCase() + mov.type.slice(1)} recorded: ${mov.productSnapshot?.name}`,
      message: `${mov.quantity} ${mov.productSnapshot?.unit || 'pcs'} deducted (${mov.reason || 'No reason provided'}).`,
      link: '/inventory?type=loss',
      createdAt: mov.createdAt,
      isRead: readKeys.has(key),
    };
  });

  const notifications = [...stockNotifications, ...lossNotifications].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  res.json({
    success: true,
    data: {
      unreadCount,
      totalCount: notifications.length,
      notifications,
    },
  });
});

export const markNotificationsRead = asyncHandler(async (req, res) => {
  const rawKeys = Array.isArray(req.body?.keys) ? req.body.keys : [];
  const keys = rawKeys
    .map((k) => String(k || '').trim())
    .filter((k) => k.length > 0 && k.length <= 120);

  if (keys.length > 0) {
    await NotificationRead.bulkWrite(
      keys.map((notificationKey) => ({
        updateOne: {
          filter: { notificationKey },
          update: { $set: { notificationKey, readAt: new Date() } },
          upsert: true,
        },
      }))
    );
  }

  res.json({
    success: true,
    message: 'Notifications marked as read',
  });
});
