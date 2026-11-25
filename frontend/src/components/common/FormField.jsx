export const inputClassName = (hasError) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-rose-400 bg-rose-50/40 focus:border-rose-500 focus:ring-rose-500/20'
      : 'border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-500/20'
  }`;

export default function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  children,
}) {
  return (
    <div>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600"
        >
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}
