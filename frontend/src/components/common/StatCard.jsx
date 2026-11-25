const ACCENT_STYLES = {
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
};

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent = 'emerald',
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {subtext && (
            <p className="mt-1.5 text-xs text-slate-500">{subtext}</p>
          )}
        </div>
        {Icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
              ACCENT_STYLES[accent] || ACCENT_STYLES.emerald
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}
