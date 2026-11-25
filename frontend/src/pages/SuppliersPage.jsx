import { Mail, Pencil, Phone, Plus, Trash2, Truck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { extractApiError } from '../api/client.js';
import { deleteSupplier, getSuppliers } from '../api/supplierApi.js';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import EmptyState from '../components/common/EmptyState.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import Pagination from '../components/common/Pagination.jsx';
import SearchFilterBar from '../components/common/SearchFilterBar.jsx';
import SortableHeader from '../components/common/SortableHeader.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import SupplierFormModal from '../components/suppliers/SupplierFormModal.jsx';
import { useDebounce } from '../hooks/useDebounce.js';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'name', label: 'Supplier Name' },
  { value: 'contactPerson', label: 'Contact Person' },
  { value: 'productCount', label: 'Linked Products' },
  { value: 'status', label: 'Status' },
];

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSuppliers({
        page,
        limit,
        sortBy,
        sortOrder,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setSuppliers(res.data || []);
      setPagination(res.pagination || null);
    } catch (error) {
      toast.error(extractApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, sortBy, sortOrder, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

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
    setStatusFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search.trim() || statusFilter);

  const handleDeleteConfirm = async () => {
    if (!deletingSupplier) return;
    setIsDeleting(true);
    try {
      const res = await deleteSupplier(deletingSupplier._id);
      toast.success(res.message || 'Supplier deleted successfully');
      setDeletingSupplier(null);
      if (suppliers.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        loadSuppliers();
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
        title="Suppliers"
        description="Manage vendor directories, contacts, and product supply partners."
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingSupplier(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Supplier
          </button>
        }
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search suppliers by name, contact, email, or phone..."
        filters={[
          {
            key: 'status',
            label: 'Status filter',
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
        onReset={handleReset}
      />

      {loading ? (
        <LoadingSpinner message="Loading suppliers..." />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={
            hasActiveFilters ? 'No matching suppliers found' : 'No suppliers yet'
          }
          description={
            hasActiveFilters
              ? 'Try clearing your search or status filter.'
              : 'Add a supplier so you can assign vendors to products.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Add Supplier'}
          onAction={
            hasActiveFilters
              ? handleReset
              : () => {
                  setEditingSupplier(null);
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
                    label="Supplier"
                    field="name"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Contact Person"
                    field="contactPerson"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Contact Info
                  </th>
                  <SortableHeader
                    label="Products"
                    field="productCount"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Status"
                    field="status"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                  />
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {suppliers.map((supplier) => (
                  <tr key={supplier._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-900">{supplier.name}</p>
                      {supplier.address && (
                        <p className="max-w-xs truncate text-xs text-slate-400">
                          {supplier.address}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {supplier.contactPerson || (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <div className="space-y-1">
                        {supplier.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                            <span>{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {!supplier.email && !supplier.phone && (
                          <span className="text-slate-400">No contact info</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/products?supplier=${supplier._id}`}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        {supplier.productCount ?? 0} product(s)
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={supplier.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSupplier(supplier);
                            setIsFormOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                          title="Edit supplier"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingSupplier(supplier)}
                          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          title="Delete supplier"
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

      <SupplierFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSupplier(null);
        }}
        supplier={editingSupplier}
        onSaved={loadSuppliers}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingSupplier)}
        onClose={() => setDeletingSupplier(null)}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title="Delete Supplier"
        message={
          deletingSupplier
            ? `Are you sure you want to delete "${deletingSupplier.name}"? Suppliers with assigned products cannot be deleted.`
            : ''
        }
      />
    </div>
  );
}
