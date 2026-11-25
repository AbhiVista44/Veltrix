import { Menu, Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getHealthStatus } from '../../api/dashboardApi.js';
import NotificationCenter from './NotificationCenter.jsx';

const PAGE_META = {
  '/': {
    title: 'Overview',
    subtitle: 'Live inventory health, valuation trends, and master metrics',
  },
  '/products': {
    title: 'Product Catalog',
    subtitle: 'Manage SKUs, pricing, stock quantities, and reorder thresholds',
  },
  '/inventory': {
    title: 'Inventory Operations',
    subtitle: 'Stock-in, stock-out, adjustments, loss tracking, and audit log',
  },
  '/analytics': {
    title: 'Analytics & Insights',
    subtitle: 'Inventory valuation, movement trends, and category breakdown',
  },
  '/alerts': {
    title: 'Alerts & Reorders',
    subtitle: 'Low-stock alerts, out-of-stock risks, and reorder suggestions',
  },
  '/categories': {
    title: 'Categories',
    subtitle: 'Organize products into structured inventory groups',
  },
  '/suppliers': {
    title: 'Suppliers',
    subtitle: 'Maintain vendor contacts and supply chain partners',
  },
};

export default function Navbar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [health, setHealth] = useState({ status: 'checking', database: 'checking' });

  const meta = PAGE_META[location.pathname] || PAGE_META['/'];

  const checkHealth = async () => {
    try {
      const result = await getHealthStatus();
      setHealth({
        status: result.status || 'ok',
        database: result.database || 'connected',
      });
    } catch {
      setHealth({ status: 'offline', database: 'disconnected' });
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const isConnected = health.database === 'connected';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-semibold text-slate-900">{meta.title}</p>
          <p className="hidden text-xs text-slate-500 sm:block">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={checkHealth}
          title="Click to refresh API & MongoDB connection status"
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${
            isConnected
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100/70'
              : 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100/70'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          <span className="hidden sm:inline">
            {isConnected ? 'DB Connected' : 'DB Offline'}
          </span>
          <RefreshCw className="h-3 w-3 opacity-60" />
        </button>

        <NotificationCenter />

        <button
          type="button"
          onClick={() => navigate('/products?new=1')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 sm:text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </button>
      </div>
    </header>
  );
}
