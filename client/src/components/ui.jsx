export const statusColor = {
  present: 'bg-emerald-100 text-emerald-800',
  late: 'bg-amber-100 text-amber-800',
  absent: 'bg-rose-100 text-rose-800',
  half_day: 'bg-orange-100 text-orange-800',
  on_leave: 'bg-sky-100 text-sky-800',
  holiday: 'bg-violet-100 text-violet-800',
  weekend: 'bg-stone-100 text-stone-600',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-stone-100 text-stone-600',
  open: 'bg-sky-100 text-sky-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  blocked: 'bg-rose-100 text-rose-800',
  in_review: 'bg-amber-100 text-amber-800',
  done: 'bg-emerald-100 text-emerald-800',
  low: 'bg-stone-100 text-stone-700',
  medium: 'bg-sky-100 text-sky-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-rose-100 text-rose-800',
};

export function Badge({ value }) {
  const cls = statusColor[value] || 'bg-stone-100 text-stone-700';
  return <span className={`badge ${cls}`}>{String(value || '').replaceAll('_', ' ')}</span>;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl text-stone-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-stone-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <div className="card-surface px-6 py-12 text-center">
      <p className="font-display text-xl text-stone-800">{title}</p>
      {hint ? <p className="mt-2 text-stone-500">{hint}</p> : null}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="card-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="font-display mt-2 text-3xl text-stone-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-stone-500">{hint}</p> : null}
    </div>
  );
}
