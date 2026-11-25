import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export default function SortableHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  align = 'left',
}) {
  const isActive = sortBy === field;

  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-emerald-700 ${
          isActive ? 'text-emerald-700' : ''
        }`}
      >
        <span>{label}</span>
        {isActive ? (
          sortOrder === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-45" />
        )}
      </button>
    </th>
  );
}
