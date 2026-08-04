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
} from 'lucide-react';
import { Badge, StatPill } from '../components/ui';

const ATTENDANCE_LABELS = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  on_leave: 'On leave',
  half_day: 'Half day',
  holiday: 'Holiday',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function QuickLink({ to, icon: Icon, title, desc, tone = 'teal' }) {
  const tones = {
    teal: 'bg-teal-50 text-teal-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    sky: 'bg-sky-50 text-sky-700',
  };
  return (
    <Link
      to={to}
      className="card-surface card-surface-hover flex items-center gap-3 p-4 transition"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <ArrowRight size={16} className="ml-auto shrink-0 text-slate-300" />
    </Link>
  );
}

export default function EmployeeDashboard({ user, data }) {
  const att = data.attendance?.status;
  const work = data.workLog;
  const workDone = work?.status === 'submitted';
  const tickets = data.openTickets || [];
  const overdue = tickets.filter((t) => t.dueDate && isPast(new Date(t.dueDate)));
  const summary = data.attendanceSummary || {};
  const monthLabel = summary.month
    ? format(parseISO(`${summary.month}-01`), 'MMMM yyyy')
    : format(new Date(), 'MMMM yyyy');

  return (
    <div className="space-y-5">
      {/* Header — consistent type scale */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            {format(parseISO(data.today), 'EEEE, dd MMMM yyyy')}
          </p>
          <h1 className="mt-1 font-display text-3xl text-slate-900">
            {greeting()}, {user?.name?.split(' ')[0]}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Submit daily work, track attendance, and manage tasks from your home screen.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Employee ID</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">{user?.employeeId || '—'}</p>
          {user?.cutoffTime ? (
            <p className="mt-1 text-xs text-slate-500">Cutoff {user.cutoffTime}</p>
          ) : null}
        </div>
      </header>

      {/* Today's priority — daily work */}
      <section className="hero-panel overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-100">
              {workDone ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-600" /> Work submitted today
                </>
              ) : (
                <>
                  <Clock3 size={14} className="text-amber-600" /> Action needed
                </>
              )}
            </div>

            <h2 className="mt-3 text-xl font-semibold text-slate-900">
              {workDone ? 'Today’s work is on record' : 'Submit your daily work'}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
              {workDone
                ? `"${work.title}" with ${work.attachments?.length || 0} proof file(s). You can still update before admin locks the day.`
                : 'Add what you completed today with proof files. Attendance (Present / Late) is marked automatically.'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/app/work" className="btn btn-primary cursor-pointer">
                <FileUp size={16} />
                {workDone ? 'Update daily work' : 'Submit daily work'}
              </Link>
              <Link to="/app/attendance" className="btn btn-secondary cursor-pointer">
                <CalendarDays size={16} />
                View attendance
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Today
            </p>
            <ul className="mt-3 space-y-2">
              <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <ClipboardList size={16} className="text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Daily work</p>
                    <p className="text-xs text-slate-500 truncate max-w-[160px]">
                      {workDone ? work.title : 'Not submitted'}
                    </p>
                  </div>
                </div>
                <Badge value={workDone ? 'submitted' : 'pending'} />
              </li>
              <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <CalendarDays size={16} className="text-emerald-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Attendance</p>
                    <p className="text-xs text-slate-500 capitalize">
                      {att ? String(att).replaceAll('_', ' ') : 'After work submit'}
                    </p>
                  </div>
                </div>
                <Badge value={att || 'pending'} />
              </li>
              <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Ticket size={16} className="text-indigo-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-900">Open tickets</p>
                    <p className="text-xs text-slate-500">
                      {tickets.length} assigned
                      {data.overdueCount ? ` · ${data.overdueCount} overdue` : ''}
                    </p>
                  </div>
                </div>
                {data.overdueCount ? (
                  <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-100">
                    {data.overdueCount} overdue
                  </span>
                ) : (
                  <Badge value="open" />
                )}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Month attendance — counts */}
      <section className="card-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Attendance · {monthLabel}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {summary.presenceRate ?? 0}% presence rate
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {summary.worked ?? 0} present days · {summary.recorded ?? 0} days recorded this month
            </p>
          </div>
          <Link
            to="/app/attendance"
            className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            Full calendar <ArrowRight size={14} />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <StatPill label="Present" value={summary.present ?? 0} tone="ok" />
          <StatPill label="Late" value={summary.late ?? 0} tone="warn" />
          <StatPill label="Absent" value={summary.absent ?? 0} tone="danger" />
          <StatPill label="On leave" value={summary.on_leave ?? 0} tone="sky" />
          <StatPill label="Half day" value={summary.half_day ?? 0} tone="neutral" />
          <StatPill label="Holiday" value={summary.holiday ?? 0} tone="violet" />
        </div>
      </section>

      {/* Overview stats row */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill
          label="Today"
          value={att ? ATTENDANCE_LABELS[att] || att : 'Pending'}
          tone={att === 'present' ? 'ok' : att === 'late' ? 'warn' : att === 'absent' ? 'danger' : 'brand'}
        />
        <StatPill label="Open tickets" value={tickets.length} tone="brand" />
        <StatPill
          label="Overdue"
          value={data.overdueCount || 0}
          tone={data.overdueCount ? 'danger' : 'ok'}
        />
        <StatPill
          label="Leave pending"
          value={data.leavePending || 0}
          tone={data.leavePending ? 'warn' : 'neutral'}
        />
      </div>

      {/* Tasks + sidebar */}
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.85fr]">
        <section className="card-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">My tasks</h3>
              <p className="text-sm text-slate-500">Tickets assigned to you</p>
            </div>
            <Link
              to="/app/tickets"
              className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {tickets.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Ticket className="mx-auto text-slate-300" size={28} />
              <p className="mt-3 text-sm font-semibold text-slate-800">No open tickets</p>
              <p className="mt-1 text-sm text-slate-500">New assigned work will appear here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tickets.slice(0, 6).map((t) => {
                const isOverdue = t.dueDate && isPast(new Date(t.dueDate));
                return (
                  <li key={t._id}>
                    <Link
                      to={`/app/tickets/${t._id}`}
                      className="flex items-start justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{t.title}</p>
                          <Badge value={t.priority} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {t.ticketNumber}
                          {t.dueDate ? ` · due ${format(new Date(t.dueDate), 'dd MMM')}` : ''}
                          {isOverdue ? ' · overdue' : ''}
                        </p>
                      </div>
                      <Badge value={t.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {overdue.length > 0 ? (
            <div className="flex items-center gap-2 border-t border-rose-100 bg-rose-50/80 px-5 py-3 text-sm text-rose-800">
              <AlertTriangle size={15} />
              {overdue.length} ticket{overdue.length > 1 ? 's' : ''} past due
            </div>
          ) : null}
        </section>

        <div className="space-y-4">
          <section className="card-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Leave balance</h3>
                <p className="text-sm text-slate-500">Available this year</p>
              </div>
              <Link to="/app/leaves" className="text-sm font-semibold text-teal-700">
                Apply
              </Link>
            </div>
            {(data.leaveBalances || []).length === 0 ? (
              <p className="text-sm text-slate-500">No leave balances configured yet.</p>
            ) : (
              <ul className="space-y-4">
                {data.leaveBalances.map((b) => {
                  const pct = b.allocated
                    ? Math.min(100, Math.round((b.remaining / b.allocated) * 100))
                    : 0;
                  return (
                    <li key={b._id}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-medium text-slate-800">{b.leaveType?.name}</span>
                        <span className="text-slate-600">
                          {b.remaining}
                          <span className="text-slate-400"> / {b.allocated}</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Used {b.used} · Pending {b.pending}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {workDone && work ? (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={18} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-950">Latest submission</p>
                  <p className="mt-1 truncate text-sm text-emerald-900">{work.title}</p>
                  <p className="mt-1 text-xs text-emerald-800/80">
                    {work.hoursWorked || 0}h · {work.attachments?.length || 0} files
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>

      {/* Quick navigation */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Quick links
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink to="/app/work" icon={FileUp} title="Daily work" desc="Submit & update" tone="teal" />
          <QuickLink
            to="/app/attendance"
            icon={CalendarDays}
            title="Attendance"
            desc="Calendar & stats"
            tone="emerald"
          />
          <QuickLink to="/app/tickets" icon={Ticket} title="Tickets" desc="Tasks & deadlines" tone="indigo" />
          <QuickLink to="/app/leaves" icon={Umbrella} title="Leaves" desc="Apply & balance" tone="sky" />
        </div>
      </section>
    </div>
  );
}
