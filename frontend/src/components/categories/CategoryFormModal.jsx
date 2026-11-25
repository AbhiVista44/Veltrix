import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { createCategory, updateCategory } from '../../api/categoryApi.js';
import { extractApiError } from '../../api/client.js';
import FormField, { inputClassName } from '../common/FormField.jsx';
import Modal from '../common/Modal.jsx';

const INITIAL_FORM = {
  name: '',
  description: '',
  status: 'active',
};

export default function CategoryFormModal({
  isOpen,
  onClose,
  category = null,
  onSaved,
}) {
  const isEditing = Boolean(category);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (category) {
      setForm({
        name: category.name || '',
        description: category.description || '',
        status: category.status || 'active',
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [isOpen, category]);

  const validate = () => {
    const nextErrors = {};
    const name = form.name.trim();
    if (name.length < 2 || name.length > 80) {
      nextErrors.name = 'Category name must be between 2 and 80 characters';
    }
    if (form.description.trim().length > 300) {
      nextErrors.description = 'Description cannot exceed 300 characters';
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
        description: form.description.trim(),
        status: form.status,
      };

      const res = isEditing
        ? await updateCategory(category._id, payload)
        : await createCategory(payload);

      toast.success(
        res.message ||
          (isEditing ? 'Category updated successfully' : 'Category created successfully')
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
      title={isEditing ? 'Edit Category' : 'Add Category'}
      subtitle={
        isEditing
          ? 'Update category details and availability status.'
          : 'Create a new product category to organize inventory.'
      }
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          label="Category Name"
          htmlFor="category-name"
          required
          error={errors.name}
        >
          <input
            id="category-name"
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="e.g. Electronics"
            className={inputClassName(errors.name)}
          />
        </FormField>

        <FormField
          label="Description"
          htmlFor="category-description"
          error={errors.description}
          hint="Optional summary (max 300 characters)."
        >
          <textarea
            id="category-description"
            rows={3}
            value={form.description}
            onChange={handleChange('description')}
            placeholder="Brief details about items in this category"
            className={inputClassName(errors.description)}
          />
        </FormField>

        <FormField label="Status" htmlFor="category-status" error={errors.status}>
          <select
            id="category-status"
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
                : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
