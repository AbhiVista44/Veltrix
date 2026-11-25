import { Plus, Shield, UserCheck, Users, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { createUser, getUsers, updateUser } from '../api/authApi.js';
import { extractApiError } from '../api/client.js';
import EmptyState from '../components/common/EmptyState.jsx';
import FormField, { inputClassName } from '../components/common/FormField.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import Modal from '../components/common/Modal.jsx';
import PageHeader from '../components/common/PageHeader.jsx';
import Pagination from '../components/common/Pagination.jsx';
import SearchFilterBar from '../components/common/SearchFilterBar.jsx';
import StatusBadge from '../components/common/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { formatDateTime } from '../utils/formatters.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function UsersPage() {
  const { user: currentUser, authEnabled } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!authEnabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getUsers({
        page,
        limit: 10,
        ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setUsers(res.data || []);
      setPagination(res.pagination || null);
    } catch (error) {
      toast.error(extractApiError(error).message);
    } finally {
      setLoading(false);
    }
  }, [authEnabled, page, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const validateNewUser = () => {
    const next = {};
    if (form.name.trim().length < 2 || form.name.trim().length > 80) {
      next.name = 'Name must be between 2 and 80 characters';
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      next.email = 'Please enter a valid email address';
    }
    if (form.password.length < 6) {
      next.password = 'Password must be at least 6 characters';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!validateNewUser()) return;

    setSubmitting(true);
    try {
      const res = await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success(res.message || 'User created');
      setModalOpen(false);
      setForm({ name: '', email: '', password: '', role: 'staff' });
      loadUsers();
    } catch (error) {
      const { message, fieldErrors } = extractApiError(error);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (targetUser, updates) => {
    try {
      const res = await updateUser(targetUser._id, updates);
      toast.success(res.message || 'User updated');
      loadUsers();
    } catch (error) {
      toast.error(extractApiError(error).message);
    }
  };

  if (!authEnabled) {
    return (
      <EmptyState
        icon={Shield}
        title="Open Access Mode Enabled"
        description="JWT authentication is currently disabled (AUTH_ENABLED=false in backend/.env). Enable AUTH_ENABLED=true to manage Admin and Staff accounts."
      />
    );
  }

  const hasActiveFilters = Boolean(search.trim() || roleFilter || statusFilter);

  return (
    <div>
      <PageHeader
        title="Team & Access Control"
        description="Manage Admin and Staff user accounts, roles, and access status."
        actions={
          <button
            type="button"
            onClick={() => {
              setErrors({});
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        }
      />

      <SearchFilterBar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search users by name or email..."
        filters={[
          {
            key: 'role',
            label: 'Role filter',
            placeholder: 'All Roles',
            value: roleFilter,
            onChange: (val) => {
              setRoleFilter(val);
              setPage(1);
            },
            options: [
              { value: 'admin', label: 'Admin' },
              { value: 'staff', label: 'Staff' },
            ],
          },
          {
            key: 'status',
            label: 'Status filter',
            placeholder: 'All Statuses',
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={() => {
          setSearch('');
          setRoleFilter('');
          setStatusFilter('');
          setPage(1);
        }}
      />

      {loading ? (
        <LoadingSpinner message="Loading team accounts..." />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No matching users found"
          description="Try clearing your active search or role filters."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Last Sign In
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Access Controls
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((item) => {
                  const isSelf = currentUser?._id === item._id;
                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">
                          {item.name}
                          {isSelf && (
                            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">{item.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          value={item.role}
                          disabled={isSelf}
                          onChange={(e) =>
                            handleUpdateUser(item, { role: e.target.value })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                        </select>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {formatDateTime(item.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() =>
                            handleUpdateUser(item, {
                              status:
                                item.status === 'active' ? 'inactive' : 'active',
                            })
                          }
                          title={
                            isSelf
                              ? 'You cannot deactivate your own session'
                              : item.status === 'active'
                                ? 'Deactivate user'
                                : 'Activate user'
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                            item.status === 'active'
                              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {item.status === 'active' ? (
                            <>
                              <UserX className="h-3.5 w-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              Activate
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Team Member"
        subtitle="Create an Admin (full control) or Staff (operations & catalog) account."
        size="sm"
      >
        <form onSubmit={handleCreateUser} className="space-y-4" noValidate>
          <FormField label="Full Name" htmlFor="user-name" required error={errors.name}>
            <input
              id="user-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Jordan Taylor"
              className={inputClassName(errors.name)}
            />
          </FormField>

          <FormField
            label="Email Address"
            htmlFor="user-email"
            required
            error={errors.email}
          >
            <input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="staff@company.com"
              className={inputClassName(errors.email)}
            />
          </FormField>

          <FormField
            label="Temporary Password"
            htmlFor="user-password"
            required
            error={errors.password}
          >
            <input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Minimum 6 characters"
              className={inputClassName(errors.password)}
            />
          </FormField>

          <FormField label="Role" htmlFor="user-role" error={errors.role}>
            <select
              id="user-role"
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className={inputClassName(errors.role)}
            >
              <option value="staff">Staff (Operations & Catalog Edit)</option>
              <option value="admin">Admin (Full Access + Deletes & Users)</option>
            </select>
          </FormField>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
