import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCheck,
  Info,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationsRead,
} from '../../api/analyticsApi.js';
import { formatDateTime } from '../../utils/formatters.js';

const SEVERITY_ICON = {
  critical: {
    icon: AlertOctagon,
    badge: 'bg-rose-50 text-rose-600',
  },
  warning: {
    icon: AlertTriangle,
    badge: 'bg-amber-50 text-amber-600',
  },
  info: {
    icon: Info,
    badge: 'bg-sky-50 text-sky-600',
  },
};

export default function NotificationCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    unreadCount: 0,
    totalCount: 0,
    notifications: [],
  });

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getNotifications();
      setData(result);
    } catch {
      // Keep UI quiet if server is temporarily unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications, location.pathname]);

  useEffect(() => {
    const handleRefresh = () => loadNotifications();
    window.addEventListener('veltrix:notifications-refresh', handleRefresh);
    return () =>
      window.removeEventListener('veltrix:notifications-refresh', handleRefresh);
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleMarkRead = async (item) => {
    if (!item.isRead) {
      try {
        await markNotificationsRead([item.id]);
        setData((prev) => ({
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          notifications: prev.notifications.map((n) =>
            n.id === item.id ? { ...n, isRead: true } : n
          ),
        }));
      } catch {
        // Non-blocking
      }
    }
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadKeys = data.notifications
      .filter((n) => !n.isRead)
      .map((n) => n.id);
    if (unreadKeys.length === 0) return;

    try {
      await markNotificationsRead(unreadKeys);
      setData((prev) => ({
        ...prev,
        unreadCount: 0,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch {
      // Non-blocking
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) loadNotifications();
        }}
        className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        aria-label="Open notifications"
        title="Notification Center"
      >
        <Bell className="h-4.5 w-4.5" />
        {data.unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
            {data.unreadCount > 99 ? '99+' : data.unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Notification Center
              </h3>
              <p className="text-[11px] text-slate-500">
                {data.unreadCount} unread of {data.totalCount} alerts
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {data.unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={loadNotifications}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                title="Refresh notifications"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {data.notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-slate-500">
                No active stock alerts or recent loss notifications.
              </div>
            ) : (
              data.notifications.map((item) => {
                const style = SEVERITY_ICON[item.severity] || SEVERITY_ICON.info;
                const Icon = style.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMarkRead(item)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      item.isRead ? 'opacity-70' : 'bg-emerald-50/20'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.badge}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {item.title}
                        </p>
                        {!item.isRead && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {item.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/alerts');
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Open Alerts & Reorder Suggestions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
