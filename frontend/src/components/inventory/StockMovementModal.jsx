import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { extractApiError } from '../../api/client.js';
import { createStockMovement } from '../../api/inventoryApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import FormField, { inputClassName } from '../common/FormField.jsx';
import Modal from '../common/Modal.jsx';

const OPERATION_TABS = [
  {
    value: 'stock_in',
    label: 'Stock In',
    icon: ArrowUpCircle,
    activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  },
  {
    value: 'stock_out',
    label: 'Stock Out',
    icon: ArrowDownCircle,
    activeClass: 'border-sky-500 bg-sky-50 text-sky-700',
  },
  {
    value: 'adjustment',
    label: 'Adjustment',
    icon: SlidersHorizontal,
    activeClass: 'border-indigo-500 bg-indigo-50 text-indigo-700',
  },
  {
    value: 'damaged',
    label: 'Damaged',
    icon: Trash2,
    activeClass: 'border-amber-500 bg-amber-50 text-amber-700',
  },
  {
    value: 'expired',
    label: 'Expired',
    icon: Trash2,
    activeClass: 'border-orange-500 bg-orange-50 text-orange-700',
  },
  {
    value: 'wasted',
    label: 'Wasted',
    icon: Trash2,
    activeClass: 'border-rose-500 bg-rose-50 text-rose-700',
  },
];

const REASON_REQUIRED_TYPES = ['adjustment', 'damaged', 'expired', 'wasted'];

const REASON_PLACEHOLDERS = {
  stock_in: 'e.g. Supplier restock delivery',
  stock_out: 'e.g. Customer order fulfillment',
  adjustment: 'e.g. Monthly cycle count reconciliation',
  damaged: 'e.g. Crushed packaging during transit',
  expired: 'e.g. Past shelf-life expiration date',
  wasted: 'e.g. Spillage or unrecoverable defect',
};

export default function StockMovementModal({
  isOpen,
  onClose,
  products = [],
  initialProduct = null,
  initialType = 'stock_in',
  initialQuantity = '',
  initialReason = '',
  onSaved,
}) {
  const { authEnabled, user } = useAuth();
  const [type, setType] = useState(initialType);
  const [productId, setProductId] = useState('');
  const [adjustmentMode, setAdjustmentMode] = useState('set');
  const [quantity, setQuantity] = useState('1');
  const [newQuantity, setNewQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [performedBy, setPerformedBy] = useState('Inventory Operator');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = useMemo(
    () =>
      products.find((p) => p._id === productId) ||
      (initialProduct?._id === productId ? initialProduct : null),
    [products, productId, initialProduct]
  );

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setType(initialType || 'stock_in');
    const targetProductId = initialProduct?._id || '';
    setProductId(targetProductId);
    setAdjustmentMode('set');
    setQuantity(initialQuantity ? String(initialQuantity) : '1');
    setNewQuantity(
      initialProduct !== null && initialProduct?.quantity !== undefined
        ? String(initialProduct.quantity)
        : ''
    );
    setReason(initialReason || '');
    setReference('');
    setNotes('');
    setPerformedBy(
      authEnabled && user?.name
        ? `${user.name} (${user.role})`
        : 'Inventory Operator'
    );
  }, [isOpen, initialProduct, initialType, initialQuantity, initialReason, authEnabled, user]);

  // Keep target count synced when user changes product in Adjustment "set" mode
  const handleProductChange = (event) => {
    const nextId = event.target.value;
    setProductId(nextId);
    const matched = products.find((p) => p._id === nextId);
    if (matched && type === 'adjustment' && adjustmentMode === 'set') {
      setNewQuantity(String(matched.quantity));
    }
    if (errors.product) {
      setErrors((prev) => ({ ...prev, product: '' }));
    }
  };

  // Compute live projected stock preview
  const preview = useMemo(() => {
    if (!selectedProduct) return null;
    const current = selectedProduct.quantity;
    let delta = null;

    if (type === 'stock_in') {
      const qty = Number(quantity);
      if (Number.isInteger(qty) && qty >= 1) delta = qty;
    } else if (
      type === 'stock_out' ||
      type === 'damaged' ||
      type === 'expired' ||
      type === 'wasted'
    ) {
      const qty = Number(quantity);
      if (Number.isInteger(qty) && qty >= 1) delta = -qty;
    } else if (type === 'adjustment') {
      if (adjustmentMode === 'set') {
        const target = Number(newQuantity);
        if (newQuantity !== '' && Number.isInteger(target) && target >= 0) {
          delta = target - current;
        }
      } else {
        const parsed = Number(quantity);
        if (quantity !== '' && Number.isInteger(parsed) && parsed !== 0) {
          delta = parsed;
        }
      }
    }

    const projected = delta !== null ? current + delta : current;
    return {
      current,
      delta,
      projected,
      wouldBeNegative: projected < 0,
      unit: selectedProduct.unit || 'pcs',
    };
  }, [selectedProduct, type, quantity, newQuantity, adjustmentMode]);

  const validate = () => {
    const nextErrors = {};

    if (!productId) {
      nextErrors.product = 'Please select a product';
    }

    if (type === 'adjustment' && adjustmentMode === 'set') {
      const parsedTarget = Number(newQuantity);
      if (newQuantity === '' || !Number.isInteger(parsedTarget) || parsedTarget < 0) {
        nextErrors.newQuantity = 'Enter a whole number of 0 or greater';
      } else if (selectedProduct && parsedTarget === selectedProduct.quantity) {
        nextErrors.newQuantity = 'New quantity matches current stock level';
      }
    } else if (type === 'adjustment') {
      const parsedDelta = Number(quantity);
      if (quantity === '' || !Number.isInteger(parsedDelta) || parsedDelta === 0) {
        nextErrors.quantity = 'Enter a non-zero whole number (e.g. 5 or -3)';
      }
    } else {
      const parsedQty = Number(quantity);
      if (quantity === '' || !Number.isInteger(parsedQty) || parsedQty < 1) {
        nextErrors.quantity = 'Quantity must be a whole number of at least 1';
      }
    }

    if (preview?.wouldBeNegative) {
      nextErrors.quantity = `Cannot reduce below 0 (only ${preview.current} ${preview.unit} available)`;
    }

    const trimmedReason = reason.trim();
    if (REASON_REQUIRED_TYPES.includes(type) && trimmedReason.length < 3) {
      nextErrors.reason = 'Please provide a reason (at least 3 characters)';
    } else if (trimmedReason.length > 200) {
      nextErrors.reason = 'Reason cannot exceed 200 characters';
    }

    if (reference.trim().length > 80) {
      nextErrors.reference = 'Reference cannot exceed 80 characters';
    }
    if (notes.trim().length > 500) {
      nextErrors.notes = 'Notes cannot exceed 500 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        product: productId,
        type,
        reason: reason.trim(),
        reference: reference.trim(),
        notes: notes.trim(),
        performedBy: performedBy.trim() || 'Inventory Operator',
      };

      if (type === 'adjustment') {
        payload.adjustmentMode = adjustmentMode;
        if (adjustmentMode === 'set') {
          payload.newQuantity = Number(newQuantity);
        } else {
          payload.quantityDelta = Number(quantity);
        }
      } else {
        payload.quantity = Number(quantity);
      }

      const res = await createStockMovement(payload);
      toast.success(res.message || 'Inventory updated successfully');
      window.dispatchEvent(new Event('veltrix:notifications-refresh'));
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

  const isReasonRequired = REASON_REQUIRED_TYPES.includes(type);
  const noProductsAvailable = products.length === 0 && !initialProduct;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Stock Movement"
      subtitle="Update stock levels automatically and record an immutable audit trail entry."
      size="lg"
    >
      {noProductsAvailable && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold">No Products Found</p>
            <p className="mt-0.5">
              Create a product on the{' '}
              <Link
                to="/products?new=1"
                onClick={onClose}
                className="font-semibold underline hover:text-amber-950"
              >
                Products page
              </Link>{' '}
              before recording stock movements.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Operation Type Selector */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Operation Type <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {OPERATION_TABS.map(({ value, label, icon: Icon, activeClass }) => {
              const isSelected = type === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setType(value);
                    setErrors({});
                    if (value === 'adjustment') {
                      setAdjustmentMode('set');
                      if (selectedProduct) {
                        setNewQuantity(String(selectedProduct.quantity));
                      }
                    } else {
                      setQuantity('1');
                    }
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? activeClass
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Selection */}
        <FormField
          label="Product"
          htmlFor="movement-product"
          required
          error={errors.product}
        >
          <select
            id="movement-product"
            value={productId}
            onChange={handleProductChange}
            disabled={Boolean(initialProduct)}
            className={inputClassName(errors.product)}
          >
            <option value="">Select a product</option>
            {(products.length > 0
              ? products
              : initialProduct
                ? [initialProduct]
                : []
            ).map((item) => (
              <option key={item._id} value={item._id}>
                {item.name} ({item.sku}) — {item.quantity} {item.unit} in stock
              </option>
            ))}
          </select>
        </FormField>

        {/* Quantity / Adjustment Mode */}
        {type === 'adjustment' ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">
                Adjustment Method:
              </span>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentMode('set');
                  setErrors({});
                  if (selectedProduct) {
                    setNewQuantity(String(selectedProduct.quantity));
                  }
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  adjustmentMode === 'set'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Set Physical Count
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdjustmentMode('delta');
                  setErrors({});
                  setQuantity('');
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  adjustmentMode === 'delta'
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                }`}
              >
                Adjust By (+/-)
              </button>
            </div>

            {adjustmentMode === 'set' ? (
              <FormField
                label="New Counted Quantity"
                htmlFor="movement-new-qty"
                required
                error={errors.newQuantity || errors.quantity}
                hint="Enter the exact physical count on shelf."
              >
                <input
                  id="movement-new-qty"
                  type="number"
                  min="0"
                  step="1"
                  value={newQuantity}
                  onChange={(e) => {
                    setNewQuantity(e.target.value);
                    setErrors((prev) => ({ ...prev, newQuantity: '', quantity: '' }));
                  }}
                  className={inputClassName(errors.newQuantity || errors.quantity)}
                />
              </FormField>
            ) : (
              <FormField
                label="Adjustment Quantity (+/-)"
                htmlFor="movement-delta-qty"
                required
                error={errors.quantity}
                hint="Positive adds stock (e.g. 5), negative deducts stock (e.g. -3)."
              >
                <input
                  id="movement-delta-qty"
                  type="number"
                  step="1"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value);
                    setErrors((prev) => ({ ...prev, quantity: '' }));
                  }}
                  placeholder="e.g. -3 or 5"
                  className={inputClassName(errors.quantity)}
                />
              </FormField>
            )}
          </div>
        ) : (
          <FormField
            label="Quantity"
            htmlFor="movement-qty"
            required
            error={errors.quantity}
          >
            <input
              id="movement-qty"
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setErrors((prev) => ({ ...prev, quantity: '' }));
              }}
              className={inputClassName(errors.quantity)}
            />
          </FormField>
        )}

        {/* Live Projected Stock Preview */}
        {preview && (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs ${
              preview.wouldBeNegative
                ? 'border-rose-200 bg-rose-50 text-rose-800'
                : 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
            }`}
          >
            <span>
              Current Stock:{' '}
              <strong>
                {preview.current} {preview.unit}
              </strong>
            </span>
            <span>
              Change:{' '}
              <strong>
                {preview.delta === null
                  ? '—'
                  : preview.delta > 0
                    ? `+${preview.delta}`
                    : preview.delta}{' '}
                {preview.delta !== null ? preview.unit : ''}
              </strong>
            </span>
            <span>
              Projected Stock:{' '}
              <strong>
                {preview.projected} {preview.unit}
              </strong>
              {preview.wouldBeNegative && ' (Blocked: negative stock)'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Reason"
            htmlFor="movement-reason"
            required={isReasonRequired}
            error={errors.reason}
          >
            <input
              id="movement-reason"
              type="text"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErrors((prev) => ({ ...prev, reason: '' }));
              }}
              placeholder={REASON_PLACEHOLDERS[type]}
              className={inputClassName(errors.reason)}
            />
          </FormField>

          <FormField
            label="Reference # (Optional)"
            htmlFor="movement-reference"
            error={errors.reference}
          >
            <input
              id="movement-reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. PO-2026-104 or INV-88"
              className={inputClassName(errors.reference)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Recorded By"
            htmlFor="movement-operator"
            error={errors.performedBy}
          >
            <input
              id="movement-operator"
              type="text"
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              disabled={authEnabled && Boolean(user?.name)}
              placeholder="Inventory Operator"
              className={`${inputClassName(errors.performedBy)} ${
                authEnabled && user?.name
                  ? 'cursor-not-allowed bg-slate-100 text-slate-600'
                  : ''
              }`}
            />
          </FormField>

          <FormField
            label="Notes (Optional)"
            htmlFor="movement-notes"
            error={errors.notes}
          >
            <input
              id="movement-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional audit notes"
              className={inputClassName(errors.notes)}
            />
          </FormField>
        </div>

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
            disabled={submitting || noProductsAvailable}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? 'Recording...' : 'Confirm Stock Movement'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
