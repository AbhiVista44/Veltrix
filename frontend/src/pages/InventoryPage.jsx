import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  ClipboardList,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { extractApiError } from '../api/client.js';
import {
  getInventorySummary,
  getStockMovements,
} from '../api/inventoryApi.js';
import { getAllProducts } from '../api/productApi.js';
import EmptyState from '../components/common/EmptyState.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import Pagination from '../components/common/Pagination.jsx';
import SearchFilterBar from '../components/common/SearchFilterBar.jsx';
import SortableHeader from '../components/common/SortableHeader.jsx';
import StatCard from '../components/common/StatCard.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import StockMovementModal from '../components/inventory/StockMovementModal.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../utils/formatters.js';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Movement Date' },
  { value: 'type', label: 'Movement Type' },
  { value: 'quantity', label: 'Quantity Moved' },
  { value: 'newQuantity', label: 'Resulting Stock' },
  { value: 'totalValue', label: 'Value Impact' },
];

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const productFilter = searchParams.get('product') || '';
  const typeFilter = searchParams.get('type') || '';
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('stock_in');

  const updateFilterParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      setSearchParams(next, { replace: true });
      setPage(1);
    },
    [searchParams, setSearchParams]
  );

  const loadReferenceData = useCallback(async () => {
    try {
      const [summaryData, productList] = await Promise.all([
        getInventorySummary(),
        getAllProducts(),
      ]);
      setSummary(summaryData);
      setProducts(productList);
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStockMovements({
        page,
        limit,
        sortBy,
        sortOrder,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(productFilter ? { product: productFilter } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });
      setMovements(res.data || []);
      setPagination(res.pagination || null);
    } catch (error) {
      toast.error(extractApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    sortBy,
    sortOrder,
    debouncedSearch,
    typeFilter,
    productFilter,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const handleMovementSaved = () => {
    loadReferenceData();
    loadMovements();
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const handleReset = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = Boolean(
    search.trim() || typeFilter || productFilter || startDate || endDate
  );

  const openMovementModal = (operationType) => {
    setModalType(operationType);
    setModalOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Inventory Movements"
        description="Execute stock-in, stock-out, adjustments, and loss tracking with an immutable audit trail."
        actions={
          <>
            <button
              type="button"
              onClick={() => openMovementModal('stock_in')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
            >
              <ArrowUpCircle className="h-4 w-4" />
              Stock In
            </button>
            <button
              type="button"
              onClick={() => openMovementModal('stock_out')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100"
            >
              <ArrowDownCircle className="h-4 w-4" />
              Stock Out
            </button>
            <button
              type="button"
              onClick={() => openMovementModal('adjustment')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Adjust
            </button>
            <button
              type="button"
              onClick={() => openMovementModal('damaged')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
            >
              <Trash2 className="h-4 w-4" />
              Damage / Loss
            </button>
          </>
        }
      />

      {/* DB-Driven Movement Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Movements"
          value={formatNumber(summary?.totalMovements || 0)}
          subtext={`${formatNumber(summary?.adjustmentCount || 0)} manual adjustments`}
          icon={ClipboardList}
          accent="slate"
        />
        <StatCard
          label="Units Received (In)"
          value={`+${formatNumber(summary?.stockInUnits || 0)}`}
          subtext="Total restocked & opening units"
          icon={ArrowUpCircle}
          accent="emerald"
        />
        <StatCard
          label="Units Issued (Out)"
          value={`-${formatNumber(summary?.stockOutUnits || 0)}`}
          subtext="Dispatched & sold units"
          icon={ArrowLeftRight}
          accent="slate"
        />
        <StatCard
          label="Damaged / Expired / Wasted"
          value={formatNumber(summary?.lossUnits || 0)}
          subtext={`${formatCurrency(summary?.lossValue || 0)} loss value · ${summary?.damagedUnits || 0} dmg · ${summary?.expiredUnits || 0} exp · ${summary?.wastedUnits || 0} wst`}
          icon={AlertTriangle}
          accent={(summary?.lossUnits || 0) > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Search, Filters, Date Range & Sorting */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search by product, SKU, reason, reference, or operator..."
        filters={[
          {
            key: 'type',
            label: 'Movement type filter',
            placeholder: 'All Movement Types',
            value: typeFilter,
            onChange: (value) => updateFilterParam('type', value),
            options: [
              { value: 'stock_in', label: 'Stock In' },
              { value: 'stock_out', label: 'Stock Out' },
              { value: 'adjustment', label: 'Adjustment' },
              { value: 'loss', label: 'All Loss (Dmg / Exp / Wst)' },
              { value: 'damaged', label: 'Damaged' },
              { value: 'expired', label: 'Expired' },
              { value: 'wasted', label: 'Wasted' },
            ],
          },
          {
            key: 'product',
            label: 'Product filter',
            placeholder: 'All Products',
            value: productFilter,
            onChange: (value) => updateFilterParam('product', value),
            options: products.map((p) => ({
              value: p._id,
              label: `${p.name} (${p.sku})`,
            })),
          },
        ]}
        sortOptions={SORT_OPTIONS}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortByChange={(value) => {
          setSortBy(value);
          setPage(1);
        }}
        onSortOrderToggle={() =>
          setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
        }
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
      />

      {/* Date Range Row */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-2xs">
        <span className="font-semibold uppercase tracking-wider text-slate-500">
          Date Range:
        </span>
        <label className="inline-flex items-center gap-1.5">
          <span>From</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="inline-flex items-center gap-1.5">
          <span>To</span>
          <input
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </div>

      {/* Audit Trail Table */}
      {loading ? (
        <LoadingSpinner message="Loading inventory audit trail..." />
      ) : movements.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            hasActiveFilters
              ? 'No matching movements found'
              : 'No inventory movements yet'
          }
          description={
            hasActiveFilters
              ? 'Try clearing your search or filter criteria.'
              : 'Record a stock-in, stock-out, adjustment, or loss event to start your audit trail.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Record Stock In'}
          onAction={
            hasActiveFilters ? handleReset : () => openMovementModal('stock_in')
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <SortableHeader
                    label="Date & Time"
                    field="createdAt"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Product
                  </th>
                  <SortableHeader
                    label="Type"
                    field="type"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Change"
                    field="quantity"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Stock Before → After"
                    field="newQuantity"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Value"
                    field="totalValue"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Reason & Reference
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Operator
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {movements.map((item) => {
                  const name =
                    item.product?.name || item.productSnapshot?.name || 'Deleted Product';
                  const sku =
                    item.product?.sku || item.productSnapshot?.sku || '—';
                  const unit =
                    item.product?.unit || item.productSnapshot?.unit || 'pcs';
                  const isPositive = item.quantityDelta > 0;

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{name}</p>
                        <p className="font-mono text-xs text-slate-500">{sku}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.type} />
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3.5 text-right font-semibold ${
                          isPositive ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isPositive
                          ? `+${formatNumber(item.quantityDelta)}`
                          : formatNumber(item.quantityDelta)}{' '}
                        <span className="text-xs font-normal text-slate-500">
                          {unit}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs text-slate-600">
                        <span>{formatNumber(item.previousQuantity)}</span>
                        <span className="mx-1.5 text-slate-400">→</span>
                        <strong className="font-semibold text-slate-900">
                          {formatNumber(item.newQuantity)} {unit}
                        </strong>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-slate-800">
                        {formatCurrency(item.totalValue)}
                      </td>
                      <td className="max-w-xs px-4 py-3.5 text-xs text-slate-600">
                        <p className="truncate font-medium text-slate-800">
                          {item.reason || '—'}
                        </p>
                        {(item.reference || item.notes) && (
                          <p className="truncate text-slate-400">
                            {[
                              item.reference ? `Ref: ${item.reference}` : '',
                              item.notes,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">
                        {item.performedBy || 'Inventory Operator'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={pagination}
            onPageChange={setPage}
            onLimitChange={(nextLimit) => {
              setLimit(nextLimit);
              setPage(1);
            }}
          />
        </div>
      )}

      <StockMovementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        products={products}
        initialType={modalType}
        onSaved={handleMovementSaved}
      />
    </div>
  );
}
