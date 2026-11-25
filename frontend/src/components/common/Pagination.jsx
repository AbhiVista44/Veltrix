import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange, onLimitChange }) {
  if (!pagination) return null;

  const { page, limit, total, totalPages, hasPrevPage, hasNextPage } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  // Build compact page number range
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let first = Math.max(1, page - 2);
    const last = Math.min(totalPages, first + maxVisible - 1);
    first = Math.max(1, last - maxVisible + 1);

    for (let i = first; i <= last; i += 1) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span>
          Showing <strong className="font-semibold text-slate-900">{start}</strong>–
          <strong className="font-semibold text-slate-900">{end}</strong> of{' '}
          <strong className="font-semibold text-slate-900">{total}</strong> results
        </span>

        {onLimitChange && (
          <label className="inline-flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={limit}
              onChange={(event) => onLimitChange(Number(event.target.value))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>

        {getPageNumbers().map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onPageChange(num)}
            className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              num === page
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
