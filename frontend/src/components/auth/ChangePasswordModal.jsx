import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { changePassword } from '../../api/authApi.js';
import { extractApiError } from '../../api/client.js';
import FormField, { inputClassName } from '../common/FormField.jsx';
import Modal from '../common/Modal.jsx';

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
  }, [isOpen]);

  const validate = () => {
    const next = {};
    if (!form.currentPassword) {
      next.currentPassword = 'Current password is required';
    }
    if (form.newPassword.length < 6) {
      next.newPassword = 'New password must be at least 6 characters';
    }
    if (form.newPassword !== form.confirmPassword) {
      next.confirmPassword = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      toast.success(res.message || 'Password updated');
      onClose();
    } catch (error) {
      const { message, fieldErrors } = extractApiError(error);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      subtitle="Update your account password."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          label="Current Password"
          htmlFor="cp-current"
          required
          error={errors.currentPassword}
        >
          <input
            id="cp-current"
            type="password"
            value={form.currentPassword}
            onChange={(e) =>
              setForm((p) => ({ ...p, currentPassword: e.target.value }))
            }
            className={inputClassName(errors.currentPassword)}
          />
        </FormField>

        <FormField
          label="New Password"
          htmlFor="cp-new"
          required
          error={errors.newPassword}
        >
          <input
            id="cp-new"
            type="password"
            value={form.newPassword}
            onChange={(e) =>
              setForm((p) => ({ ...p, newPassword: e.target.value }))
            }
            className={inputClassName(errors.newPassword)}
          />
        </FormField>

        <FormField
          label="Confirm New Password"
          htmlFor="cp-confirm"
          required
          error={errors.confirmPassword}
        >
          <input
            id="cp-confirm"
            type="password"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm((p) => ({ ...p, confirmPassword: e.target.value }))
            }
            className={inputClassName(errors.confirmPassword)}
          />
        </FormField>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
