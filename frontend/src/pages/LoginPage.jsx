import { Boxes, Lock, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { extractApiError } from '../api/client.js';
import FormField, { inputClassName } from '../components/common/FormField.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
  const { authEnabled, hasUsers, user, loading, authError, login, setupAdmin, refreshAuth } =
    useAuth();

  const isSetupMode = authEnabled && !hasUsers;

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!authEnabled || user)) {
      navigate('/', { replace: true });
    }
  }, [loading, authEnabled, user, navigate]);

  const validate = () => {
    const next = {};
    if (isSetupMode && (form.name.trim().length < 2 || form.name.trim().length > 80)) {
      next.name = 'Full name must be between 2 and 80 characters';
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      next.email = 'Please enter a valid email address';
    }
    if (isSetupMode) {
      if (form.password.length < 6) {
        next.password = 'Password must be at least 6 characters';
      }
      if (form.password !== form.confirmPassword) {
        next.confirmPassword = 'Passwords do not match';
      }
    } else if (!form.password) {
      next.password = 'Password is required';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isSetupMode) {
        await setupAdmin({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        toast.success('Admin account created. Welcome to Veltrix!');
      } else {
        await login({
          email: form.email.trim(),
          password: form.password,
        });
        toast.success('Signed in successfully');
      }
      navigate('/', { replace: true });
    } catch (error) {
      const { message, fieldErrors } = extractApiError(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md">
          <LoadingSpinner message="Checking workspace authentication..." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Veltrix Inventory
            </h1>
            <p className="text-xs font-medium text-emerald-700">
              {isSetupMode ? 'Initial Admin Setup' : 'Workspace Sign In'}
            </p>
          </div>
        </div>

        {authError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
            <p className="text-xs font-medium text-rose-700">{authError}</p>
            <button
              type="button"
              onClick={refreshAuth}
              className="mt-3 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
              {isSetupMode ? (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <p className="leading-relaxed">
                {isSetupMode
                  ? 'No users exist yet. Create the first Administrator account to secure your inventory workspace and invite Staff users.'
                  : 'Sign in with your Admin or Staff account to access inventory operations and analytics.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {isSetupMode && (
                <FormField
                  label="Full Name"
                  htmlFor="auth-name"
                  required
                  error={errors.name}
                >
                  <input
                    id="auth-name"
                    type="text"
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder="e.g. Abhishek Wakchaure"
                    className={inputClassName(errors.name)}
                  />
                </FormField>
              )}

              <FormField
                label="Email Address"
                htmlFor="auth-email"
                required
                error={errors.email}
              >
                <input
                  id="auth-email"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  placeholder="you@company.com"
                  className={inputClassName(errors.email)}
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="auth-password"
                required
                error={errors.password}
              >
                <input
                  id="auth-password"
                  type="password"
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder={isSetupMode ? 'Minimum 6 characters' : 'Enter password'}
                  className={inputClassName(errors.password)}
                />
              </FormField>

              {isSetupMode && (
                <FormField
                  label="Confirm Password"
                  htmlFor="auth-confirm-password"
                  required
                  error={errors.confirmPassword}
                >
                  <input
                    id="auth-confirm-password"
                    type="password"
                    value={form.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    placeholder="Re-enter password"
                    className={inputClassName(errors.confirmPassword)}
                  />
                </FormField>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {submitting
                  ? 'Please wait...'
                  : isSetupMode
                    ? 'Create Admin Account'
                    : 'Sign In'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
