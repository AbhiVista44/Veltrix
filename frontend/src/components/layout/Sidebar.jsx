import {
  ArrowLeftRight,
  BarChart3,
  BellRing,
  Boxes,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  Truck,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import ChangePasswordModal from '../auth/ChangePasswordModal.jsx';

const BASE_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/inventory', label: 'Inventory', icon: ArrowLeftRight },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/alerts', label: 'Alerts & Reorders', icon: BellRing },
  { to: '/categories', label: 'Categories', icon: FolderTree },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
];

export default function Sidebar({ isOpen, onClose }) {
  const { authEnabled, user, isAdmin, logout } = useAuth();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const navItems =
    authEnabled && isAdmin
      ? [
          ...BASE_NAV_ITEMS,
          { to: '/users', label: 'Team & Access', icon: Users },
        ]
      : BASE_NAV_ITEMS;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-900">
                Veltrix
              </span>
              <span className="block text-[11px] font-medium text-emerald-700">
                Inventory Suite
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Workspace
          </p>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {user?.name || 'Inventory Operator'}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {authEnabled ? user?.email : 'Open Access Mode'}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  user?.role === 'admin'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-sky-100 text-sky-800'
                }`}
              >
                {authEnabled ? user?.role || 'staff' : 'open'}
              </span>
            </div>

            {authEnabled && !user?.isGuestMode && (
              <div className="mt-3 flex items-center gap-2 border-t border-slate-200/80 pt-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  <KeyRound className="h-3 w-3" />
                  Password
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <LogOut className="h-3 w-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
}
