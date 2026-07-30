import { Link } from 'react-router-dom';
import { format, parseISO, isPast } from 'date-fns';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileUp,
  Ticket,
  Umbrella,
  AlertTriangle,
  CircleDashed,
} from 'lucide-react';
import { Badge } from '../components/ui';

function Metric({ icon: Icon, label, value, hint, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-stone-50 text-stone-700',
    ok: 'bg-emerald-50 text-emerald-800',
    warn: 'bg-amber-50 text-amber-900',
    danger: 'bg-rose-50 text-rose-800',
    brand: 'bg-teal-50 text-teal-900',
  };
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
            {label}
          </p>
          <p className="font-display mt-2 text-2xl capitalize text-stone-900">{value}</p>
          {hint ? <p className="mt-1 text-sm text-stone-500">{hint}</p> : null}
        </div>
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function EmployeeDashboard({ user, data }) {
  const att = data.attendance?.status;
  const work = data.workLog;
  const workDone = work?.status === 'submitted';
  const tickets = data.openTickets || [];
  const overdue = tickets.filter((t) => t.dueDate && isPast(new Date(t.dueDate)));
  const dueSoon = tickets.filter(
    (t) => t.dueDate && !isPast(new Date(t.dueDate))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-800">
            {format(parseISO(data.today), 'EEEE, dd MMMM yyyy')}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-900 sm:text-5xl">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-2 max-w-2xl text-stone-500">
            Manage your daily work, attendance, tickets, and leave from one place.
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
          <p className="text-stone-500">Employee ID</p>
          <p className="font-semibold text-stone-900">{user?.employeeId || '—'}</p>
        </div>
      </header>

      {/* Primary daily work CTA — dominant, not a tiny button */}
      <section
        className={`relative overflow-hidden rounded-[28px] border ${
          workDone
            ? 'border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5_0%,#f0fdfa_45%,#fffbeb_100%)]'
            : 'border-teal-200 bg-[linear-gradient(135deg,#f0fdfa_0%,#fffcf7_55%,#fff7ed_100%)]'
        }`}
      >
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal-700/10 blur-2xl" />
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-orange-400/10 blur-2xl" />

        <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.35fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-800/10 bg-white/80 px-3 py-1 text-xs font-semibold text-teal-900">
              {workDone ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-600" /> Today’s work submitted
                </>
              ) : (
                <>
                  <CircleDashed size={14} className="text-amber-600" /> Action needed today
                </>
              )}
            </div>

            <h2 className="font-display mt-4 text-3xl text-stone-900 sm:text-4xl">
              {workDone ? 'Your daily work is on record' : 'Submit your daily work'}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-600">
              {workDone
                ? `“${work.title}” is saved with ${work.attachments?.length || 0} proof file(s). You can still update it before admin locks the day.`
                : 'Add what you completed today with screenshots or files. Attendance (Present / Late) is marked automatically from this submission.'}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/app/work" className="btn-cta group">
                <span className="btn-cta-icon">
                  {workDone ? <ClipboardList size={18} /> : <FileUp size={18} />}
                </span>
                <span className="text-left">
                  <span className="block">
                    {workDone ? 'Open / update daily work' : 'Submit daily work now'}
                  </span>
                  <span className="btn-cta-sub">
                    {workDone
                      ? 'View details · edit · add proof'
                      : 'Title · description · proof files'}
                  </span>
                </span>
                <ArrowRight
                  size={18}
                  className="ml-1 transition group-hover:translate-x-0.5"
                />
              </Link>

              <Link to="/app/attendance" className="btn-secondary rounded-2xl px-5 py-4">
                <CalendarDays size={16} />
                Check attendance
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Today at a glance
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-teal-50 p-2 text-teal-800">
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Daily work</p>
                    <p className="text-xs text-stone-500">
                      {workDone ? work.title : 'Not submitted'}
                    </p>
                  </div>
                </div>
                <Badge value={workDone ? 'submitted' : 'pending'} />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2 text-emerald-800">
                    <CalendarDays size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Attendance</p>
                    <p className="text-xs text-stone-500">
                      {att
                        ? String(att).replaceAll('_', ' ')
                        : 'Marks after work submit'}
                    </p>
                  </div>
                </div>
                <Badge value={att || 'pending'} />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-800">
                    <Ticket size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Open tasks</p>
                    <p className="text-xs text-stone-500">
                      {tickets.length} ticket{tickets.length === 1 ? '' : 's'} assigned
                    </p>
                  </div>
                </div>
                {data.overdueCount ? (
                  <span className="badge bg-rose-100 text-rose-800">
                    {data.overdueCount} overdue
                  </span>
                ) : (
                  <Badge value="open" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={CalendarDays}
          label="Attendance"
          value={att ? String(att).replaceAll('_', ' ') : 'Pending'}
          hint={workDone ? 'Based on today’s work' : 'Submit work to mark it'}
          tone={att === 'present' ? 'ok' : att === 'late' ? 'warn' : att === 'absent' ? 'danger' : 'brand'}
        />
        <Metric
          icon={Ticket}
          label="Open tickets"
          value={tickets.length}
          hint={`${dueSoon.length} with due date`}
          tone="brand"
        />
        <Metric
          icon={AlertTriangle}
          label="Overdue"
          value={data.overdueCount || 0}
          hint="Need attention"
          tone={data.overdueCount ? 'danger' : 'ok'}
        />
        <Metric
          icon={Umbrella}
          label="Leave requests"
          value={data.leavePending || 0}
          hint="Pending approval"
          tone={data.leavePending ? 'warn' : 'neutral'}
        />
      </div>

      {/* Tasks + leave */}
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.9fr]">
        <section className="card-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h3 className="font-display text-xl text-stone-900">My tasks</h3>
              <p className="text-sm text-stone-500">Tickets assigned to you</p>
            </div>
            <Link
              to="/app/tickets"
              className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {tickets.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Ticket className="mx-auto text-stone-300" size={28} />
                <p className="mt-3 font-semibold text-stone-800">No open tickets</p>
                <p className="mt-1 text-sm text-stone-500">
                  New assigned work will show up here
                </p>
              </div>
            ) : (
              tickets.slice(0, 6).map((t) => {
                const overdueTicket = t.dueDate && isPast(new Date(t.dueDate));
                return (
                  <Link
                    key={t._id}
                    to={`/app/tickets/${t._id}`}
                    className="flex items-start justify-between gap-4 px-5 py-4 transition hover:bg-stone-50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-stone-900">{t.title}</p>
                        <Badge value={t.priority} />
                      </div>
                      <p className="mt-1 text-xs text-stone-500">
                        {t.ticketNumber}
                        {t.dueDate
                          ? ` · due ${format(new Date(t.dueDate), 'dd MMM')}`
                          : ''}
                        {overdueTicket ? ' · overdue' : ''}
                      </p>
                    </div>
                    <Badge value={t.status} />
                  </Link>
                );
              })
            )}
          </div>

          {overdue.length > 0 ? (
            <div className="border-t border-[var(--line)] bg-rose-50/60 px-5 py-3 text-sm text-rose-800">
              {overdue.length} ticket{overdue.length > 1 ? 's are' : ' is'} past due — update status
              or add a comment.
            </div>
          ) : null}
        </section>

        <div className="space-y-4">
          <section className="card-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl text-stone-900">Leave balance</h3>
                <p className="text-sm text-stone-500">Available this year</p>
              </div>
              <Link to="/app/leaves" className="text-sm font-semibold text-teal-800">
                Apply
              </Link>
            </div>
            <ul className="space-y-4">
              {(data.leaveBalances || []).length === 0 ? (
                <li className="text-sm text-stone-500">No leave balances yet</li>
              ) : (
                data.leaveBalances.map((b) => {
                  const pct = b.allocated
                    ? Math.min(100, Math.round((b.remaining / b.allocated) * 100))
                    : 0;
                  return (
                    <li key={b._id}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-semibold text-stone-800">
                          {b.leaveType?.name}
                        </span>
                        <span className="text-stone-500">
                          {b.remaining}
                          <span className="text-stone-400"> / {b.allocated}</span>
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Link
              to="/app/work"
              className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 transition hover:border-teal-700/35 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
                <FileUp size={18} />
              </div>
              <p className="mt-3 font-semibold text-stone-900">Daily work</p>
              <p className="mt-1 text-xs text-stone-500">Submit · edit · proof</p>
            </Link>
            <Link
              to="/app/attendance"
              className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 transition hover:border-teal-700/35 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <CalendarDays size={18} />
              </div>
              <p className="mt-3 font-semibold text-stone-900">Attendance</p>
              <p className="mt-1 text-xs text-stone-500">Calendar · summary</p>
            </Link>
            <Link
              to="/app/tickets"
              className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 transition hover:border-teal-700/35 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-800">
                <Ticket size={18} />
              </div>
              <p className="mt-3 font-semibold text-stone-900">Tickets</p>
              <p className="mt-1 text-xs text-stone-500">Tasks · deadlines</p>
            </Link>
            <Link
              to="/app/leaves"
              className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] p-4 transition hover:border-teal-700/35 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-800">
                <Umbrella size={18} />
              </div>
              <p className="mt-3 font-semibold text-stone-900">Leaves</p>
              <p className="mt-1 text-xs text-stone-500">Apply · balance</p>
            </Link>
          </section>

          {workDone && work ? (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 text-emerald-700" size={18} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-950">Latest submission</p>
                  <p className="mt-1 truncate text-sm text-emerald-900/80">{work.title}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-800/70">
                    <Clock3 size={12} /> {work.hoursWorked || 0}h ·{' '}
                    {work.attachments?.length || 0} files
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
