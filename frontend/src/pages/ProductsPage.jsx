import {
  ArrowLeftRight,
  Package,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAllCategories } from '../api/categoryApi.js';
import { extractApiError } from '../api/client.js';
import { deleteProduct, getProducts } from '../api/productApi.js';
import { getAllSuppliers } from '../api/supplierApi.js';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import Pagination from '../components/common/Pagination.jsx';
import SearchFilterBar from '../components/common/SearchFilterBar.jsx';
import SortableHeader from '../components/common/SortableHeader.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import StockMovementModal from '../components/inventory/StockMovementModal.jsx';
import ProductFormModal from '../components/products/ProductFormModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import {
  PRODUCT_UNITS,
  formatCurrency,
  formatNumber,
  getStockStatus,
} from '../utils/formatters.js';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Added' },
  { value: 'name', label: 'Product Name' },
  { value: 'sku', label: 'SKU' },
  { value: 'price', label: 'Unit Price' },
  { value: 'quantity', label: 'Stock Quantity' },
  { value: 'reorderLevel', label: 'Reorder Level' },
];

export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & query state (URL params are source of truth for cross-page filters)
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const categoryFilter = searchParams.get('category') || '';
  const supplierFilter = searchParams.get('supplier') || '';
  const stockStatusFilter = searchParams.get('stockStatus') || '';
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [unitFilter, setUnitFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minQty, setMinQty] = useState('');
  const [maxQty, setMaxQty] = useState('');
  const debouncedMinPrice = useDebounce(minPrice, 300);
  const debouncedMaxPrice = useDebounce(maxPrice, 300);
  const debouncedMinQty = useDebounce(minQty, 300);
  const debouncedMaxQty = useDebounce(maxQty, 300);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Handle "?new=1" trigger from Navbar "+ Add Product" button
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingProduct(null);
      setIsFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadMasterOptions = useCallback(async () => {
    try {
      const [catList, supList] = await Promise.all([
        getAllCategories(''),
        getAllSuppliers(''),
      ]);
      setCategories(catList);
      setSuppliers(supList);
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts({
        page,
        limit,
        sortBy,
        sortOrder,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(supplierFilter ? { supplier: supplierFilter } : {}),
        ...(stockStatusFilter ? { stockStatus: stockStatusFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(unitFilter ? { unit: unitFilter } : {}),
        ...(debouncedMinPrice !== '' ? { minPrice: debouncedMinPrice } : {}),
        ...(debouncedMaxPrice !== '' ? { maxPrice: debouncedMaxPrice } : {}),
        ...(debouncedMinQty !== '' ? { minQty: debouncedMinQty } : {}),
        ...(debouncedMaxQty !== '' ? { maxQty: debouncedMaxQty } : {}),
      });
      setProducts(res.data || []);
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
    categoryFilter,
    supplierFilter,
    stockStatusFilter,
    statusFilter,
    unitFilter,
    debouncedMinPrice,
    debouncedMaxPrice,
    debouncedMinQty,
    debouncedMaxQty,
  ]);

  useEffect(() => {
    loadMasterOptions();
  }, [loadMasterOptions]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'createdAt' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setUnitFilter('');
    setMinPrice('');
    setMaxPrice('');
    setMinQty('');
    setMaxQty('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const advancedFilterCount = [
    unitFilter,
    minPrice,
    maxPrice,
    minQty,
    maxQty,
  ].filter(Boolean).length;

  const hasActiveFilters = Boolean(
    search.trim() ||
      categoryFilter ||
      supplierFilter ||
      stockStatusFilter ||
      statusFilter ||
      advancedFilterCount > 0
  );

  const handleDeleteConfirm = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await deleteProduct(deletingProduct._id);
      toast.success(res.message || 'Product deleted successfully');
      setDeletingProduct(null);
      if (products.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        loadProducts();
      }
    } catch (error) {
      toast.error(extractApiError(error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage product master records, SKU pricing, and reorder thresholds."
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                showAdvanced || advancedFilterCount > 0
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Advanced Filters</span>
              {advancedFilterCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {advancedFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </>
        }
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search products by name, SKU, or description..."
        filters={[
          {
            key: 'category',
            label: 'Category filter',
            placeholder: 'All Categories',
            value: categoryFilter,
            onChange: (value) => updateFilterParam('category', value),
            options: categories.map((c) => ({ value: c._id, label: c.name })),
          },
          {
            key: 'supplier',
            label: 'Supplier filter',
            placeholder: 'All Suppliers',
            value: supplierFilter,
            onChange: (value) => updateFilterParam('supplier', value),
            options: suppliers.map((s) => ({ value: s._id, label: s.name })),
          },
          {
            key: 'stockStatus',
            label: 'Stock status filter',
            placeholder: 'All Stock Levels',
            value: stockStatusFilter,
            onChange: (value) => updateFilterParam('stockStatus', value),
            options: [
              { value: 'in_stock', label: 'In Stock' },
              { value: 'low_stock', label: 'Low Stock' },
              { value: 'out_of_stock', label: 'Out of Stock' },
            ],
          },
          {
            key: 'status',
            label: 'Record status filter',
            placeholder: 'All Statuses',
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setPage(1);
            },
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
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
        onReset={handleResetFilters}
      />

      {showAdvanced && (
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-medium text-slate-700">
            <span className="mb-1 block font-semibold uppercase tracking-wide text-slate-500">
              Min Price ($)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value);
                setPage(1);
              }}
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            <span className="mb-1 block font-semibold uppercase tracking-wide text-slate-500">
              Max Price ($)
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                setPage(1);
              }}
              placeholder="Any"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            <span className="mb-1 block font-semibold uppercase tracking-wide text-slate-500">
              Min Quantity
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={minQty}
              onChange={(e) => {
                setMinQty(e.target.value);
                setPage(1);
              }}
              placeholder="0"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            <span className="mb-1 block font-semibold uppercase tracking-wide text-slate-500">
              Max Quantity
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={maxQty}
              onChange={(e) => {
                setMaxQty(e.target.value);
                setPage(1);
              }}
              placeholder="Any"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            />
          </label>
          <label className="text-xs font-medium text-slate-700">
            <span className="mb-1 block font-semibold uppercase tracking-wide text-slate-500">
              Unit Type
            </span>
            <select
              value={unitFilter}
              onChange={(e) => {
                setUnitFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Units</option>
              {PRODUCT_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {loading ? (
        <LoadingSpinner message="Loading products..." />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title={hasActiveFilters ? 'No matching products found' : 'No products yet'}
          description={
            hasActiveFilters
              ? 'Try clearing or adjusting your search query and active filters.'
              : 'Get started by adding your first product to the catalog.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Add Product'}
          onAction={
            hasActiveFilters
              ? handleResetFilters
              : () => {
                  setEditingProduct(null);
                  setIsFormOpen(true);
                }
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <SortableHeader
                    label="Product"
                    field="name"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="SKU"
                    field="sku"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Supplier
                  </th>
                  <SortableHeader
                    label="Price"
                    field="price"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="Stock"
                    field="quantity"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Stock Health
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900">{product.name}</p>
                      {product.description && (
                        <p className="max-w-xs truncate text-xs text-slate-400">
                          {product.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-700">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {product.category?.name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {product.supplier?.name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-slate-900">
                        {formatNumber(product.quantity)}
                      </span>{' '}
                      <span className="text-xs text-slate-500">{product.unit}</span>
                      <p className="text-[11px] text-slate-400">
                        Min {product.reorderLevel}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={getStockStatus(product)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setStockProduct(product)}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700"
                          title="Update stock (In / Out / Adjust / Loss)"
                        >
                          <ArrowLeftRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(product);
                            setIsFormOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                          title="Edit product"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(product)}
                          disabled={!isAdmin}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-35"
                          title={
                            isAdmin
                              ? 'Delete product'
                              : 'Admin role required to delete products'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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

      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        categories={categories}
        suppliers={suppliers}
        onSaved={loadProducts}
      />

      <StockMovementModal
        isOpen={Boolean(stockProduct)}
        onClose={() => setStockProduct(null)}
        products={products}
        initialProduct={stockProduct}
        initialType="stock_in"
        onSaved={loadProducts}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title="Delete Product"
        message={
          deletingProduct
            ? `Are you sure you want to delete "${deletingProduct.name}" (${deletingProduct.sku})?`
            : ''
        }
      />
    </div>
  );
}
