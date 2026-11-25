import {
  AlertTriangle,
  Boxes,
  DollarSign,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAnalyticsOverview } from '../api/analyticsApi.js';
import { getAllCategories } from '../api/categoryApi.js';
import { extractApiError } from '../api/client.js';
import { getAllSuppliers } from '../api/supplierApi.js';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import StatCard from '../components/common/StatCard.jsx';
import { formatCurrency, formatNumber } from '../utils/formatters.js';

const TIME_WINDOWS = [
  { value: 7, label: '7D' },
  { value: 14, label: '14D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
];

const HEALTH_COLORS = ['#059669', '#d97706', '#e11d48'];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [trendMetric, setTrendMetric] = useState('units');

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMasterOptions = useCallback(async () => {
    try {
      const [cats, sups] = await Promise.all([
        getAllCategories(''),
        getAllSuppliers(''),
      ]);
      setCategories(cats);
      setSuppliers(sups);
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnalyticsOverview({
        days,
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(supplierFilter ? { supplier: supplierFilter } : {}),
      });
      setAnalytics(data);
    } catch (error) {
      toast.error(extractApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, [days, categoryFilter, supplierFilter]);

  useEffect(() => {
    loadMasterOptions();
  }, [loadMasterOptions]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const valuation = analytics?.valuation || {
    totalProducts: 0,
    activeProducts: 0,
    totalUnits: 0,
    totalValuation: 0,
    averageUnitValue: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    inStockValuation: 0,
    lowStockValuation: 0,
  };

  const stockTrends = analytics?.stockTrends || [];
  const categoryInsights = analytics?.categoryInsights || [];
  const topValuedProducts = analytics?.topValuedProducts || [];

  const healthPieData = [
    { name: 'In Stock', value: valuation.inStockCount },
    { name: 'Low Stock', value: valuation.lowStockCount },
    { name: 'Out of Stock', value: valuation.outOfStockCount },
  ].filter((entry) => entry.value > 0);

  return (
    <div>
      <PageHeader
        title="Inventory Analytics"
        description="Live valuation insights, stock-in vs stock-out trends, and category performance."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {TIME_WINDOWS.map((win) => (
                <button
                  key={win.value}
                  type="button"
                  onClick={() => setDays(win.value)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    days === win.value
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {win.label}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter analytics by category"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              aria-label="Filter analytics by supplier"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((sup) => (
                <option key={sup._id} value={sup._id}>
                  {sup.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        }
      />

      {loading && !analytics ? (
        <LoadingSpinner message="Computing live inventory analytics..." />
      ) : (
        <div className="space-y-6">
          {/* Valuation KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Inventory Valuation"
              value={formatCurrency(valuation.totalValuation)}
              subtext={`Avg unit value: ${formatCurrency(valuation.averageUnitValue)}`}
              icon={DollarSign}
              accent="emerald"
            />
            <StatCard
              label="Healthy Stock Value"
              value={formatCurrency(valuation.inStockValuation)}
              subtext={`${formatNumber(valuation.inStockCount)} SKUs above reorder level`}
              icon={Layers}
              accent="emerald"
            />
            <StatCard
              label="At-Risk Stock Value"
              value={formatCurrency(valuation.lowStockValuation)}
              subtext={`${valuation.lowStockCount} low · ${valuation.outOfStockCount} out of stock`}
              icon={AlertTriangle}
              accent={
                valuation.lowStockCount + valuation.outOfStockCount > 0
                  ? 'amber'
                  : 'emerald'
              }
            />
            <StatCard
              label="Units On Hand"
              value={formatNumber(valuation.totalUnits)}
              subtext={`${formatNumber(valuation.activeProducts)} active of ${formatNumber(valuation.totalProducts)} SKUs`}
              icon={Boxes}
              accent="slate"
            />
          </div>

          {/* Row 1: Stock-In vs Stock-Out Trends + Stock Health Donut */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-2">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Stock-In vs Stock-Out Trends ({days} Days)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daily movement activity including stock loss (damaged, expired, wasted)
                  </p>
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setTrendMetric('units')}
                    className={`rounded-md px-2.5 py-1 font-medium ${
                      trendMetric === 'units'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Units
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendMetric('value')}
                    className={`rounded-md px-2.5 py-1 font-medium ${
                      trendMetric === 'value'
                        ? 'bg-white text-emerald-700 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Value ($)
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stockTrends}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="stockInGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="stockOutGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      minTickGap={20}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(val) =>
                        trendMetric === 'value' ? `$${val}` : val
                      }
                    />
                    <Tooltip
                      formatter={(val, name) =>
                        trendMetric === 'value'
                          ? [formatCurrency(val), name]
                          : [formatNumber(val), name]
                      }
                      contentStyle={{
                        borderRadius: '0.75rem',
                        borderColor: '#e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area
                      type="monotone"
                      dataKey={trendMetric === 'value' ? 'stockInValue' : 'stockIn'}
                      name="Stock In"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#stockInGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey={trendMetric === 'value' ? 'stockOutValue' : 'stockOut'}
                      name="Stock Out"
                      stroke="#0284c7"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#stockOutGrad)"
                    />
                    {trendMetric === 'units' && (
                      <Area
                        type="monotone"
                        dataKey="loss"
                        name="Damaged / Loss"
                        stroke="#e11d48"
                        strokeWidth={1.8}
                        fillOpacity={0}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Stock Health Distribution */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Stock Health Split
                  </h2>
                  <p className="text-xs text-slate-500">
                    SKU status distribution
                  </p>
                </div>
                <Link
                  to="/alerts"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  View alerts
                </Link>
              </div>

              {healthPieData.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                  No product stock data yet.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="46%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {healthPieData.map((entry) => {
                          const colorIdx =
                            entry.name === 'In Stock'
                              ? 0
                              : entry.name === 'Low Stock'
                                ? 1
                                : 2;
                          return (
                            <Cell
                              key={entry.name}
                              fill={HEALTH_COLORS[colorIdx]}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [`${val} SKUs`, 'Count']}
                        contentStyle={{
                          borderRadius: '0.75rem',
                          borderColor: '#e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {/* Row 2: Category Valuation Bar Chart + Category Insights Table */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Category-Wise Inventory Valuation
                </h2>
                <p className="text-xs text-slate-500">
                  Total stock value held per category ($)
                </p>
              </div>

              {categoryInsights.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-slate-500">
                  No category valuation data available.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryInsights.slice(0, 8)}
                      margin={{ top: 10, right: 12, left: 4, bottom: 10 }}
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
                        fill="#059669"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* Category Breakdown Table */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-900">
                  Category Insights
                </h2>
                <p className="text-xs text-slate-500">
                  SKUs, unit volume, alerts, and valuation share by category
                </p>
              </div>

              {categoryInsights.length === 0 ? (
                <div className="px-5 py-12 text-center text-xs text-slate-500">
                  No categories found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Category
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          SKUs
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Units
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Alerts
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Valuation
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {categoryInsights.map((cat) => {
                        const alertTotal =
                          (cat.lowStockCount || 0) + (cat.outOfStockCount || 0);
                        return (
                          <tr key={cat._id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3">
                              <Link
                                to={`/products?category=${cat._id}`}
                                className="font-medium text-slate-900 hover:text-emerald-700"
                              >
                                {cat.name}
                              </Link>
                              <p className="text-[11px] text-slate-400">
                                {cat.sharePercent}% of total value
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              {formatNumber(cat.productCount)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              {formatNumber(cat.totalUnits)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                  alertTotal > 0
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {alertTotal}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              {formatCurrency(cat.totalValuation)}
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

          {/* Top Valued Products */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Top Valued Products
                </h2>
                <p className="text-xs text-slate-500">
                  Products representing the highest inventory capital on hand
                </p>
              </div>
              <Link
                to="/products"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Open catalog
              </Link>
            </div>

            {topValuedProducts.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-slate-500">
                Add products to view inventory valuation rankings.
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
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        On Hand
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Stock Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {topValuedProducts.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <p className="font-mono text-xs text-slate-500">
                            {item.sku}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.categoryName}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          {formatNumber(item.quantity)} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          {formatCurrency(item.valuation)}
                        </td>
                      </tr>
                    ))}
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
