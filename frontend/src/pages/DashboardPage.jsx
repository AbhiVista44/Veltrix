import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  DollarSign,
  FolderTree,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAnalyticsOverview } from '../api/analyticsApi.js';
import { extractApiError } from '../api/client.js';
import { getDashboardSummary } from '../api/dashboardApi.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import StatCard from '../components/common/StatCard.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getStockStatus,
} from '../utils/formatters.js';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [summaryData, analyticsData] = await Promise.all([
        getDashboardSummary(),
        getAnalyticsOverview({ days: 7 }),
      ]);
      setSummary(summaryData);
      setAnalytics(analyticsData);
    } catch (err) {
      const { message } = extractApiError(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const stats = summary?.stats || {
    totalProducts: 0,
    activeProducts: 0,
    totalUnits: 0,
    totalInventoryValue: 0,
    totalCategories: 0,
    activeCategories: 0,
    totalSuppliers: 0,
    activeSuppliers: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  const categoryBreakdown = summary?.categoryBreakdown || [];
  const lowStockProducts = summary?.lowStockProducts || [];
  const recentProducts = summary?.recentProducts || [];
  const recentMovements = summary?.recentMovements || [];
  const stockTrends = analytics?.stockTrends || [];
  const categoryInsights = analytics?.categoryInsights || [];

  const attentionCount = stats.lowStockCount + stats.outOfStockCount;

  return (
    <div>
      <PageHeader
        title="Inventory Dashboard"
        description="Real-time overview driven directly from your MongoDB database."
        actions={
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {loading && !summary ? (
        <LoadingSpinner message="Loading live inventory metrics..." />
      ) : error && !summary ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <button
            type="button"
            onClick={loadSummary}
            className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Primary KPI Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Products"
              value={formatNumber(stats.totalProducts)}
              subtext={`${formatNumber(stats.activeProducts)} active SKUs in catalog`}
              icon={Package}
              accent="emerald"
            />
            <StatCard
              label="Total Stock Units"
              value={formatNumber(stats.totalUnits)}
              subtext={`Across ${formatNumber(stats.totalCategories)} categories`}
              icon={Boxes}
              accent="emerald"
            />
            <StatCard
              label="Catalog Stock Value"
              value={formatCurrency(stats.totalInventoryValue)}
              subtext="Sum of unit price × quantity"
              icon={DollarSign}
              accent="slate"
            />
            <StatCard
              label="Stock Attention"
              value={formatNumber(attentionCount)}
              subtext={`${stats.lowStockCount} low stock · ${stats.outOfStockCount} out of stock`}
              icon={AlertTriangle}
              accent={attentionCount > 0 ? 'amber' : 'emerald'}
            />
          </div>

          {/* Master Data Quick Links */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              to="/categories"
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:border-emerald-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <FolderTree className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatNumber(stats.totalCategories)} Categories
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatNumber(stats.activeCategories)} active · Manage product groups
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
            </Link>

            <Link
              to="/suppliers"
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-all hover:border-emerald-300 hover:shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatNumber(stats.totalSuppliers)} Suppliers
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatNumber(stats.activeSuppliers)} active · Manage vendor directory
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
            </Link>
          </div>

          {/* Analytics Charts Preview */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    7-Day Stock-In vs Stock-Out
                  </h2>
                  <p className="text-xs text-slate-500">
                    Recent daily unit movement trend
                  </p>
                </div>
                <Link
                  to="/analytics"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Full analytics
                </Link>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stockTrends}
                    margin={{ top: 5, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '0.75rem',
                        borderColor: '#e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey="stockIn"
                      name="Stock In"
                      fill="#059669"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="stockOut"
                      name="Stock Out"
                      fill="#0284c7"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Category Valuation Snapshot
                  </h2>
                  <p className="text-xs text-slate-500">
                    Top categories by stock value ($)
                  </p>
                </div>
                <Link
                  to="/alerts"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Reorder alerts
                </Link>
              </div>
              {categoryInsights.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-xs text-slate-500">
                  Add categories and products to visualize valuation.
                </div>
              ) : (
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryInsights.slice(0, 6)}
                      margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        tickFormatter={(val) => `$${val}`}
                      />
                      <Tooltip
                        formatter={(val) => [formatCurrency(val), 'Valuation']}
                        contentStyle={{
                          borderRadius: '0.75rem',
                          borderColor: '#e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Bar
                        dataKey="totalValuation"
                        name="Valuation"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {/* Middle Panels */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Low & Out-of-Stock Watchlist */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Low & Out-of-Stock Watchlist
                  </h2>
                  <p className="text-xs text-slate-500">
                    Products at or below their configured reorder level
                  </p>
                </div>
                <Link
                  to="/products?stockStatus=low_stock"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  View in catalog
                </Link>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  {stats.totalProducts === 0
                    ? 'Add products to start monitoring stock thresholds.'
                    : 'All products are currently above their reorder levels.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {lowStockProducts.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          SKU: {item.sku} · Reorder at {item.reorderLevel}{' '}
                          {item.unit}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold text-slate-800">
                          {item.quantity} {item.unit}
                        </span>
                        <StatusBadge status={getStockStatus(item)} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Category Distribution */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Category Distribution
                  </h2>
                  <p className="text-xs text-slate-500">
                    Top categories by assigned products and units
                  </p>
                </div>
                <Link
                  to="/categories"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Manage
                </Link>
              </div>

              {categoryBreakdown.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  No categories created yet. Create a category to organize products.
                </div>
              ) : (
                <div className="space-y-4 p-5">
                  {categoryBreakdown.map((cat) => {
                    const percent =
                      stats.totalProducts > 0
                        ? Math.round((cat.productCount / stats.totalProducts) * 100)
                        : 0;

                    return (
                      <div key={cat._id}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <Link
                            to={`/products?category=${cat._id}`}
                            className="font-medium text-slate-800 hover:text-emerald-700"
                          >
                            {cat.name}
                          </Link>
                          <span className="text-xs text-slate-500">
                            {cat.productCount} SKUs · {formatNumber(cat.totalUnits)} units
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Recently Added Products */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Recently Added Products
                </h2>
                <p className="text-xs text-slate-500">
                  Latest items registered in the master catalog
                </p>
              </div>
              <Link
                to="/products"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                View all products
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentProducts.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-slate-500">
                  No products in the database yet.
                </p>
                <Link
                  to="/products?new=1"
                  className="mt-3 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Add Your First Product
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Supplier
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Stock Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Added
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {recentProducts.map((product) => (
                      <tr key={product._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500">{product.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {product.category?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {product.supplier?.name || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatNumber(product.quantity)} {product.unit}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={getStockStatus(product)} />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {formatDate(product.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent Inventory Movements */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Recent Inventory Movements
                </h2>
                <p className="text-xs text-slate-500">
                  Latest stock-in, stock-out, adjustment, and loss audit events
                </p>
              </div>
              <Link
                to="/inventory"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                View audit log
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recentMovements.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                No stock movements recorded yet. Record a movement on the{' '}
                <Link
                  to="/inventory"
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  Inventory page
                </Link>
                .
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Type
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Change
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Before → After
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Reason
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {recentMovements.map((mov) => {
                      const unit = mov.product?.unit || mov.productSnapshot?.unit || 'pcs';
                      const isPositive = mov.quantityDelta > 0;
                      return (
                        <tr key={mov._id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">
                              {mov.product?.name || mov.productSnapshot?.name}
                            </p>
                            <p className="font-mono text-xs text-slate-500">
                              {mov.product?.sku || mov.productSnapshot?.sku}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={mov.type} />
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${
                              isPositive ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? `+${mov.quantityDelta}` : mov.quantityDelta}{' '}
                            {unit}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-600">
                            {mov.previousQuantity} →{' '}
                            <strong className="text-slate-900">
                              {mov.newQuantity} {unit}
                            </strong>
                          </td>
                          <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-600">
                            {mov.reason || '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                            {formatDateTime(mov.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
