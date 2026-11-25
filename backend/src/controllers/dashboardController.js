import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Supplier } from '../models/Supplier.js';
import { StockMovement } from '../models/StockMovement.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export const getDashboardSummary = asyncHandler(async (_req, res) => {
  const [
    productAgg,
    totalCategories,
    activeCategories,
    totalSuppliers,
    activeSuppliers,
    categoryBreakdown,
    lowStockProducts,
    recentProducts,
    recentMovements,
  ] = await Promise.all([
    Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
          totalUnits: { $sum: '$quantity' },
          totalInventoryValue: {
            $sum: { $multiply: ['$price', '$quantity'] },
          },
          outOfStockCount: {
            $sum: { $cond: [{ $eq: ['$quantity', 0] }, 1, 0] },
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
        },
      },
    ]),
    Category.countDocuments(),
    Category.countDocuments({ status: 'active' }),
    Supplier.countDocuments(),
    Supplier.countDocuments({ status: 'active' }),
    Category.aggregate([
      {
        $lookup: {
          from: Product.collection.name,
          localField: '_id',
          foreignField: 'category',
          as: 'products',
        },
      },
      {
        $project: {
          name: 1,
          status: 1,
          productCount: { $size: '$products' },
          totalUnits: { $sum: '$products.quantity' },
        },
      },
      { $sort: { productCount: -1, name: 1 } },
      { $limit: 6 },
    ]),
    Product.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    })
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort({ quantity: 1, updatedAt: -1 })
      .limit(6),
    Product.find()
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .limit(6),
    StockMovement.find()
      .populate('product', 'name sku unit')
      .sort({ createdAt: -1 })
      .limit(6),
  ]);

  const rawStats = productAgg[0] || {};

  res.json({
    success: true,
    data: {
      stats: {
        totalProducts: rawStats.totalProducts || 0,
        activeProducts: rawStats.activeProducts || 0,
        totalUnits: rawStats.totalUnits || 0,
        totalInventoryValue: Number(
          (rawStats.totalInventoryValue || 0).toFixed(2)
        ),
        totalCategories,
        activeCategories,
        totalSuppliers,
        activeSuppliers,
        lowStockCount: rawStats.lowStockCount || 0,
        outOfStockCount: rawStats.outOfStockCount || 0,
      },
      categoryBreakdown,
      lowStockProducts,
      recentProducts,
      recentMovements,
    },
  });
});
