import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { extractApiError } from '../../api/client.js';
import { createSupplier, updateSupplier } from '../../api/supplierApi.js';
import FormField, { inputClassName } from '../common/FormField.jsx';
import Modal from '../common/Modal.jsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_FORM = {
  name: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  status: 'active',
};

export default function SupplierFormModal({
  isOpen,
  onClose,
  supplier = null,
  onSaved,
}) {
  const isEditing = Boolean(supplier);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (supplier) {
      setForm({
        name: supplier.name || '',
        contactPerson: supplier.contactPerson || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        status: supplier.status || 'active',
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [isOpen, supplier]);

  const validate = () => {
    const nextErrors = {};
    const name = form.name.trim();
    const email = form.email.trim();

    if (name.length < 2 || name.length > 120) {
      nextErrors.name = 'Supplier name must be between 2 and 120 characters';
    }
    if (form.contactPerson.trim().length > 100) {
      nextErrors.contactPerson = 'Contact person cannot exceed 100 characters';
    }
    if (email && !EMAIL_REGEX.test(email)) {
      nextErrors.email = 'Please enter a valid email address';
    }
    if (form.phone.trim().length > 30) {
      nextErrors.phone = 'Phone number cannot exceed 30 characters';
    }
    if (form.address.trim().length > 300) {
      nextErrors.address = 'Address cannot exceed 300 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        status: form.status,
      };

      const res = isEditing
        ? await updateSupplier(supplier._id, payload)
        : await createSupplier(payload);

      toast.success(
        res.message ||
          (isEditing ? 'Supplier updated successfully' : 'Supplier created successfully')
      );
      onSaved(res.data);
      onClose();
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Supplier' : 'Add Supplier'}
      subtitle={
        isEditing
          ? 'Update vendor contact information and status.'
          : 'Register a supplier to link products in your catalog.'
      }
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Supplier Name"
            htmlFor="supplier-name"
            required
            error={errors.name}
          >
            <input
              id="supplier-name"
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g. Apex Tech Distributors"
              className={inputClassName(errors.name)}
            />
          </FormField>

          <FormField
            label="Contact Person"
            htmlFor="supplier-contact"
            error={errors.contactPerson}
          >
            <input
              id="supplier-contact"
              type="text"
              value={form.contactPerson}
              onChange={handleChange('contactPerson')}
              placeholder="e.g. Priya Sharma"
              className={inputClassName(errors.contactPerson)}
            />
          </FormField>

          <FormField
            label="Email Address"
            htmlFor="supplier-email"
            error={errors.email}
          >
            <input
              id="supplier-email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              placeholder="orders@supplier.com"
              className={inputClassName(errors.email)}
            />
          </FormField>

          <FormField
            label="Phone Number"
            htmlFor="supplier-phone"
            error={errors.phone}
          >
            <input
              id="supplier-phone"
              type="tel"
              value={form.phone}
              onChange={handleChange('phone')}
              placeholder="+1 (555) 234-5678"
              className={inputClassName(errors.phone)}
            />
          </FormField>
        </div>

        <FormField label="Address" htmlFor="supplier-address" error={errors.address}>
          <textarea
            id="supplier-address"
            rows={2}
            value={form.address}
            onChange={handleChange('address')}
            placeholder="Street, city, state, postal code"
            className={inputClassName(errors.address)}
          />
        </FormField>

        <FormField label="Status" htmlFor="supplier-status" error={errors.status}>
          <select
            id="supplier-status"
            value={form.status}
            onChange={handleChange('status')}
            className={inputClassName(errors.status)}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </FormField>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : 'Create Supplier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
