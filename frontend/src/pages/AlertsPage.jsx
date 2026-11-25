import {
  AlertOctagon,
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  DollarSign,
  PackagePlus,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAlertsAndReorders } from '../api/analyticsApi.js';
import { getAllCategories } from '../api/categoryApi.js';
import { extractApiError } from '../api/client.js';
import { getAllSuppliers } from '../api/supplierApi.js';
import EmptyState from '../components/common/EmptyState.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import SearchFilterBar from '../components/common/SearchFilterBar.jsx';
import StatCard from '../components/common/StatCard.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import StockMovementModal from '../components/inventory/StockMovementModal.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { formatCurrency, formatNumber } from '../utils/formatters.js';

const URGENCY_BADGE = {
  critical: {
    label: 'Critical',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  high: {
    label: 'High',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  },
};

export default function AlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState({ summary: null, alerts: [] });
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const severityFilter = searchParams.get('severity') || '';
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [restockTarget, setRestockTarget] = useState(null);

  const updateSeverityParam = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set('severity', value);
    } else {
      next.delete('severity');
    }
    setSearchParams(next, { replace: true });
  };

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

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAlertsAndReorders({
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(severityFilter ? { severity: severityFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(supplierFilter ? { supplier: supplierFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setData(result);
    } catch (error) {
      toast.error(extractApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    severityFilter,
    categoryFilter,
    supplierFilter,
    statusFilter,
  ]);

  useEffect(() => {
    loadMasterOptions();
  }, [loadMasterOptions]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleReset = () => {
    setSearch('');
    setCategoryFilter('');
    setSupplierFilter('');
    setStatusFilter('');
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = Boolean(
    search.trim() ||
      severityFilter ||
      categoryFilter ||
      supplierFilter ||
      statusFilter
  );

  const summary = data.summary || {
    totalAlerts: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    totalSuggestedUnits: 0,
    totalEstimatedRestockCost: 0,
  };

  return (
    <div>
      <PageHeader
        title="Alerts & Reorder Suggestions"
        description="Monitor low-stock and out-of-stock SKUs with data-driven replenishment quantities."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Stock Alerts"
          value={formatNumber(summary.totalAlerts)}
          subtext="Products at or below reorder threshold"
          icon={AlertTriangle}
          accent={summary.totalAlerts > 0 ? 'amber' : 'emerald'}
        />
        <StatCard
          label="Out of Stock"
          value={formatNumber(summary.outOfStockCount)}
          subtext="Immediate replenishment required"
          icon={AlertOctagon}
          accent={summary.outOfStockCount > 0 ? 'rose' : 'emerald'}
        />
        <StatCard
          label="Suggested Order Units"
          value={formatNumber(summary.totalSuggestedUnits)}
          subtext={`Across ${summary.lowStockCount} low-stock & ${summary.outOfStockCount} empty SKUs`}
          icon={PackagePlus}
          accent="emerald"
        />
        <StatCard
          label="Est. Restock Budget"
          value={formatCurrency(summary.totalEstimatedRestockCost)}
          subtext="Based on current catalog unit prices"
          icon={DollarSign}
          accent="slate"
        />
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search alerted products by name or SKU..."
        filters={[
          {
            key: 'severity',
            label: 'Severity filter',
            placeholder: 'All Alert Severities',
            value: severityFilter,
            onChange: updateSeverityParam,
            options: [
              { value: 'out_of_stock', label: 'Out of Stock' },
              { value: 'low_stock', label: 'Low Stock' },
            ],
          },
          {
            key: 'category',
            label: 'Category filter',
            placeholder: 'All Categories',
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categories.map((c) => ({ value: c._id, label: c.name })),
          },
          {
            key: 'supplier',
            label: 'Supplier filter',
            placeholder: 'All Suppliers',
            value: supplierFilter,
            onChange: setSupplierFilter,
            options: suppliers.map((s) => ({ value: s._id, label: s.name })),
          },
          {
            key: 'status',
            label: 'Status filter',
            placeholder: 'All Statuses',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
      />

      {loading ? (
        <LoadingSpinner message="Analyzing reorder thresholds and stock velocity..." />
      ) : data.alerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={
            hasActiveFilters
              ? 'No matching alerts found'
              : 'All stock levels are healthy'
          }
          description={
            hasActiveFilters
              ? 'Try clearing your active search or alert filters.'
              : 'Every product in your catalog is currently above its reorder level.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onAction={hasActiveFilters ? handleReset : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Supplier Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Alert Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Stock / Min
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    30d Outflow
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Suggested Reorder
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Est. Cost
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.alerts.map((item) => {
                  const urgencyStyle =
                    URGENCY_BADGE[item.urgency] || URGENCY_BADGE.medium;
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          <span className="font-mono">{item.sku}</span> ·{' '}
                          {item.category?.name || 'Uncategorized'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">
                          {item.supplier?.name || '—'}
                        </p>
                        <p className="text-slate-400">
                          {item.supplier?.email ||
                            item.supplier?.phone ||
                            item.supplier?.contactPerson ||
                            'No contact info'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={item.stockStatus} />
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${urgencyStyle.className}`}
                          >
                            {urgencyStyle.label}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <span className="font-semibold text-slate-900">
                          {formatNumber(item.quantity)}
                        </span>{' '}
                        <span className="text-xs text-slate-400">
                          / {formatNumber(item.reorderLevel)} {item.unit}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-slate-600">
                        {formatNumber(item.recent30dOutflow)} {item.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-emerald-700">
                        +{formatNumber(item.suggestedOrderQty)} {item.unit}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-slate-900">
                        {formatCurrency(item.estimatedRestockCost)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setRestockTarget(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-700"
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          Restock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <StockMovementModal
        isOpen={Boolean(restockTarget)}
        onClose={() => setRestockTarget(null)}
        products={data.alerts}
        initialProduct={restockTarget}
        initialType="stock_in"
        initialQuantity={restockTarget?.suggestedOrderQty}
        initialReason="Reorder replenishment"
        onSaved={loadAlerts}
      />
    </div>
  );
}
