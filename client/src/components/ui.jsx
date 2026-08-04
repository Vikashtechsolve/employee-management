export const statusColor = {
  present: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  late: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
  absent: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  half_day: 'bg-orange-50 text-orange-800 ring-1 ring-orange-100',
  on_leave: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
  holiday: 'bg-violet-50 text-violet-800 ring-1 ring-violet-100',
  weekend: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  pending: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  cancelled: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  open: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
  in_progress: 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100',
  blocked: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  in_review: 'bg-amber-50 text-amber-800 ring-1 ring-amber-100',
  done: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  low: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
  medium: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
  high: 'bg-orange-50 text-orange-800 ring-1 ring-orange-100',
  urgent: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
};

export function Badge({ value }) {
  const cls = statusColor[value] || 'bg-slate-100 text-slate-700 ring-1 ring-slate-200';
  return <span className={`badge ${cls}`}>{String(value || '').replaceAll('_', ' ')}</span>;
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-slate-500">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint }) {
  return (
    <div className="card-surface px-6 py-14 text-center">
      <p className="font-display text-xl text-slate-800">{title}</p>
      {hint ? <p className="mt-2 text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <div className="card-surface p-5 transition hover:shadow-[var(--shadow-md)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-display mt-2 text-3xl text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

const statPillTones = {
  neutral: 'bg-slate-50 text-slate-800 ring-slate-200',
  ok: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
  warn: 'bg-amber-50 text-amber-900 ring-amber-100',
  danger: 'bg-rose-50 text-rose-800 ring-rose-100',
  brand: 'bg-teal-50 text-teal-800 ring-teal-100',
  sky: 'bg-sky-50 text-sky-800 ring-sky-100',
  violet: 'bg-violet-50 text-violet-800 ring-violet-100',
};

export function StatPill({ label, value, tone = 'neutral' }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${statPillTones[tone] || statPillTones.neutral}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

export function FormField({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function SectionCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <section className={`card-surface overflow-hidden ${className}`}>
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}
