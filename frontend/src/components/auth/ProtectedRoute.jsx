import { ShieldAlert } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { loading, authEnabled, user, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md">
          <LoadingSpinner message="Verifying workspace session..." />
        </div>
      </div>
    );
  }

  if (authEnabled && !user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="mx-auto max-w-lg py-12">
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Admin Access Required
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Your current role ({user?.role || 'staff'}) does not have permission to view this page.
          </p>
          <Link
            to="/"
            className="mt-5 inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
