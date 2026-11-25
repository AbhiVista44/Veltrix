import { ArrowDownAZ, ArrowUpAZ, RotateCcw, Search } from 'lucide-react';

export default function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  sortOptions = [],
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderToggle,
  onReset,
  hasActiveFilters = false,
}) {
  return (
    <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {filters.map((filter) => (
            <select
              key={filter.key}
              value={filter.value}
              onChange={(event) => filter.onChange(event.target.value)}
              aria-label={filter.label}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
            >
              <option value="">{filter.placeholder}</option>
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}

          {sortOptions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={sortBy}
                onChange={(event) => onSortByChange(event.target.value)}
                aria-label="Sort by"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Sort: {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={onSortOrderToggle}
                title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                {sortOrder === 'asc' ? (
                  <ArrowUpAZ className="h-4 w-4 text-emerald-600" />
                ) : (
                  <ArrowDownAZ className="h-4 w-4 text-emerald-600" />
                )}
                <span className="hidden sm:inline">
                  {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                </span>
              </button>
            </div>
          )}

          {hasActiveFilters && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
