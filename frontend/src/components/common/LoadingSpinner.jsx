export default function LoadingSpinner({ message = 'Loading data...' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-14 text-center">
      <div className="h-9 w-9 animate-spin rounded-full border-3 border-emerald-200 border-t-emerald-600" />
      <p className="mt-3 text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
}
