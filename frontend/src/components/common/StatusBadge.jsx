const STATUS_CONFIG = {
  in_stock: {
    label: 'In Stock',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  low_stock: {
    label: 'Low Stock',
    className: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  out_of_stock: {
    label: 'Out of Stock',
    className: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  active: {
    label: 'Active',
    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    className: 'bg-slate-100 text-slate-600 ring-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
