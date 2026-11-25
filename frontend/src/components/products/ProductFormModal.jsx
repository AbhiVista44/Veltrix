import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { extractApiError } from '../../api/client.js';
import { createProduct, updateProduct } from '../../api/productApi.js';
import { PRODUCT_UNITS } from '../../utils/formatters.js';
import FormField, { inputClassName } from '../common/FormField.jsx';
import Modal from '../common/Modal.jsx';

const SKU_REGEX = /^[A-Z0-9._-]+$/;

const INITIAL_FORM = {
  name: '',
  sku: '',
  category: '',
  supplier: '',
  price: '',
  quantity: '0',
  reorderLevel: '10',
  unit: 'pcs',
  description: '',
  status: 'active',
};

export default function ProductFormModal({
  isOpen,
  onClose,
  product = null,
  categories = [],
  suppliers = [],
  onSaved,
}) {
  const isEditing = Boolean(product);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const missingDependencies = categories.length === 0 || suppliers.length === 0;

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        category: product.category?._id || product.category || '',
        supplier: product.supplier?._id || product.supplier || '',
        price: product.price !== undefined ? String(product.price) : '',
        quantity: product.quantity !== undefined ? String(product.quantity) : '0',
        reorderLevel:
          product.reorderLevel !== undefined ? String(product.reorderLevel) : '10',
        unit: product.unit || 'pcs',
        description: product.description || '',
        status: product.status || 'active',
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [isOpen, product]);

  const validate = () => {
    const nextErrors = {};
    const name = form.name.trim();
    const sku = form.sku.trim().toUpperCase();
    const price = Number(form.price);
    const quantity = Number(form.quantity);
    const reorderLevel = Number(form.reorderLevel);

    if (name.length < 2 || name.length > 150) {
      nextErrors.name = 'Product name must be between 2 and 150 characters';
    }
    if (sku.length < 2 || sku.length > 50 || !SKU_REGEX.test(sku)) {
      nextErrors.sku =
        'SKU must be 2–50 characters (letters, numbers, -, _, .)';
    }
    if (!form.category) {
      nextErrors.category = 'Please select a category';
    }
    if (!form.supplier) {
      nextErrors.supplier = 'Please select a supplier';
    }
    if (form.price === '' || !Number.isFinite(price) || price < 0) {
      nextErrors.price = 'Price must be 0 or greater';
    }
    if (form.quantity === '' || !Number.isInteger(quantity) || quantity < 0) {
      nextErrors.quantity = 'Quantity must be a whole number (0 or greater)';
    }
    if (
      form.reorderLevel === '' ||
      !Number.isInteger(reorderLevel) ||
      reorderLevel < 0
    ) {
      nextErrors.reorderLevel = 'Reorder level must be a whole number (0 or greater)';
    }
    if (form.description.trim().length > 500) {
      nextErrors.description = 'Description cannot exceed 500 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field) => (event) => {
    const rawValue = event.target.value;
    const value = field === 'sku' ? rawValue.toUpperCase() : rawValue;
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
        sku: form.sku.trim().toUpperCase(),
        category: form.category,
        supplier: form.supplier,
        price: Number(form.price),
        quantity: Number(form.quantity),
        reorderLevel: Number(form.reorderLevel),
        unit: form.unit,
        description: form.description.trim(),
        status: form.status,
      };

      const res = isEditing
        ? await updateProduct(product._id, payload)
        : await createProduct(payload);

      toast.success(
        res.message ||
          (isEditing ? 'Product updated successfully' : 'Product created successfully')
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
      title={isEditing ? 'Edit Product' : 'Add New Product'}
      subtitle={
        isEditing
          ? 'Modify product attributes, pricing, or reorder threshold.'
          : 'Add a product to your master catalog.'
      }
      size="lg"
    >
      {missingDependencies && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">Categories & Suppliers Required</p>
            <p className="mt-0.5 leading-relaxed">
              Before adding a product, ensure you have at least one{' '}
              <Link
                to="/categories"
                onClick={onClose}
                className="font-semibold underline hover:text-amber-950"
              >
                Category
              </Link>{' '}
              and one{' '}
              <Link
                to="/suppliers"
                onClick={onClose}
                className="font-semibold underline hover:text-amber-950"
              >
                Supplier
              </Link>{' '}
              created.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Product Name"
            htmlFor="product-name"
            required
            error={errors.name}
          >
            <input
              id="product-name"
              type="text"
              value={form.name}
              onChange={handleChange('name')}
              placeholder="e.g. Wireless Barcode Scanner"
              className={inputClassName(errors.name)}
            />
          </FormField>

          <FormField
            label="SKU"
            htmlFor="product-sku"
            required
            error={errors.sku}
            hint="Unique stock keeping unit (e.g. EL-1004)"
          >
            <input
              id="product-sku"
              type="text"
              value={form.sku}
              onChange={handleChange('sku')}
              placeholder="e.g. EL-1004"
              className={inputClassName(errors.sku)}
            />
          </FormField>

          <FormField
            label="Category"
            htmlFor="product-category"
            required
            error={errors.category}
          >
            <select
              id="product-category"
              value={form.category}
              onChange={handleChange('category')}
              className={inputClassName(errors.category)}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                  {cat.status === 'inactive' ? ' (Inactive)' : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Supplier"
            htmlFor="product-supplier"
            required
            error={errors.supplier}
          >
            <select
              id="product-supplier"
              value={form.supplier}
              onChange={handleChange('supplier')}
              className={inputClassName(errors.supplier)}
            >
              <option value="">Select supplier</option>
              {suppliers.map((sup) => (
                <option key={sup._id} value={sup._id}>
                  {sup.name}
                  {sup.status === 'inactive' ? ' (Inactive)' : ''}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="Unit Price ($)"
            htmlFor="product-price"
            required
            error={errors.price}
          >
            <input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={handleChange('price')}
              placeholder="0.00"
              className={inputClassName(errors.price)}
            />
          </FormField>

          <FormField
            label={isEditing ? 'Current Stock Quantity' : 'Opening Stock Quantity'}
            htmlFor="product-quantity"
            required
            error={errors.quantity}
            hint={
              isEditing
                ? 'Stock changes are managed via Inventory Movements to preserve your audit trail.'
                : 'Initial units in stock (automatically logged as opening stock).'
            }
          >
            <input
              id="product-quantity"
              type="number"
              min="0"
              step="1"
              value={form.quantity}
              onChange={handleChange('quantity')}
              disabled={isEditing}
              placeholder="0"
              className={`${inputClassName(errors.quantity)} ${
                isEditing ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''
              }`}
            />
          </FormField>

          <FormField
            label="Reorder Level"
            htmlFor="product-reorder"
            required
            error={errors.reorderLevel}
            hint="Alert threshold when stock drops to or below this level"
          >
            <input
              id="product-reorder"
              type="number"
              min="0"
              step="1"
              value={form.reorderLevel}
              onChange={handleChange('reorderLevel')}
              placeholder="10"
              className={inputClassName(errors.reorderLevel)}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Unit" htmlFor="product-unit" error={errors.unit}>
              <select
                id="product-unit"
                value={form.unit}
                onChange={handleChange('unit')}
                className={inputClassName(errors.unit)}
              >
                {PRODUCT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Status" htmlFor="product-status" error={errors.status}>
              <select
                id="product-status"
                value={form.status}
                onChange={handleChange('status')}
                className={inputClassName(errors.status)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FormField>
          </div>
        </div>

        <FormField
          label="Description"
          htmlFor="product-description"
          error={errors.description}
        >
          <textarea
            id="product-description"
            rows={2}
            value={form.description}
            onChange={handleChange('description')}
            placeholder="Optional specifications, storage notes, or variant details"
            className={inputClassName(errors.description)}
          />
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
            disabled={submitting || missingDependencies}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting
              ? 'Saving...'
              : isEditing
                ? 'Save Changes'
                : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
