import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  Palmtree,
  Info,
  Upload,
} from 'lucide-react';
import api from '../api/client';
import { Badge, PageHeader } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const STATUS_META = {
  present: {
    label: 'Present',
    color: 'bg-emerald-500',
    soft: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    hint: 'Work submitted before cutoff',
  },
  late: {
    label: 'Late',
    color: 'bg-amber-500',
    soft: 'bg-amber-100 text-amber-900 border-amber-200',
    hint: 'Work submitted after cutoff',
  },
  absent: {
    label: 'Absent',
    color: 'bg-rose-500',
    soft: 'bg-rose-100 text-rose-800 border-rose-200',
    hint: 'No work submitted on a working day',
  },
  half_day: {
    label: 'Half day',
    color: 'bg-orange-500',
    soft: 'bg-orange-100 text-orange-900 border-orange-200',
    hint: 'Marked as half day',
  },
  on_leave: {
    label: 'On leave',
    color: 'bg-sky-500',
    soft: 'bg-sky-100 text-sky-900 border-sky-200',
    hint: 'Approved leave for this day',
  },
  holiday: {
    label: 'Holiday',
    color: 'bg-violet-500',
    soft: 'bg-violet-100 text-violet-900 border-violet-200',
    hint: 'Company holiday',
  },
  weekend: {
    label: 'Weekend',
    color: 'bg-stone-400',
    soft: 'bg-stone-100 text-stone-600 border-stone-200',
    hint: 'Non-working day',
  },
};

function statusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status ? String(status).replaceAll('_', ' ') : 'Not marked',
      color: 'bg-stone-300',
      soft: 'bg-stone-100 text-stone-600 border-stone-200',
      hint: 'Attendance not recorded yet',
    }
  );
}

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const from = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const to = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['my-attendance', from, to],
    queryFn: async () =>
      (await api.get('/attendance/me', { params: { from, to } })).data.data,
  });

  const { data: todayWork } = useQuery({
    queryKey: ['work-today'],
    queryFn: async () => (await api.get('/worklogs/today')).data.data,
  });

  const byDate = useMemo(() => {
    const map = {};
    for (const row of rows) map[row.date] = row;
    return map;
  }, [rows]);

  const summary = useMemo(() => {
    const map = {
      present: 0,
      late: 0,
      absent: 0,
      on_leave: 0,
      holiday: 0,
      half_day: 0,
      weekend: 0,
    };
    for (const row of rows) {
      map[row.status] = (map[row.status] || 0) + 1;
    }
    const worked = map.present + map.late + map.half_day;
    const countable = worked + map.absent;
    const presenceRate = countable > 0 ? Math.round((worked / countable) * 100) : 0;
    return { ...map, worked, countable, presenceRate };
  }, [rows]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [monthDate]);

  const selected = byDate[selectedDate] || null;
  const selectedMeta = statusMeta(selected?.status);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const todayRow = byDate[todayKey];
  const todayMeta = statusMeta(todayRow?.status);

  return (
    <div>
      <PageHeader
        title="My attendance"
        subtitle="See how your daily work submissions turn into attendance"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary px-2"
              onClick={() => setMonthDate((d) => subMonths(d, 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="min-w-[140px] text-center font-semibold text-stone-800">
              {format(monthDate, 'MMMM yyyy')}
            </div>
            <button
              type="button"
              className="btn btn-secondary px-2"
              onClick={() => setMonthDate((d) => addMonths(d, 1))}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      {/* Today hero */}
      <section className="mb-5 overflow-hidden rounded-3xl border border-[var(--line)] bg-gradient-to-br from-teal-950 via-teal-900 to-stone-900 text-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.3fr_1fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200/80">
              Today · {format(new Date(), 'EEEE, dd MMM yyyy')}
            </p>
            <h2 className="font-display mt-3 text-4xl sm:text-5xl">
              {todayRow ? todayMeta.label : 'Not marked yet'}
            </h2>
            <p className="mt-3 max-w-xl text-teal-50/85">
              {todayRow
                ? todayRow.remarks || todayMeta.hint
                : todayWork
                  ? 'Your work is saved. Attendance updates when status is submitted.'
                  : 'Submit today’s work with proof before cutoff to get Present.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/app/work" className="btn-cta-light">
                <Upload size={16} />
                {todayWork ? 'Update today’s work' : 'Submit today’s work'}
              </Link>
              <Link to="/app/leaves" className="btn-ghost-dark">
                Apply leave
              </Link>
            </div>
          </div>
          <div className="border-t border-white/10 bg-black/15 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-teal-100">How attendance is marked</p>
            <ul className="mt-4 space-y-3 text-sm text-teal-50/90">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={16} />
                <span>
                  <strong>Present</strong> — submit work before your cutoff (
                  {user?.cutoffTime || '11:00'})
                </span>
              </li>
              <li className="flex gap-3">
                <Clock3 className="mt-0.5 shrink-0 text-amber-300" size={16} />
                <span>
                  <strong>Late</strong> — submit work after cutoff on the same day
                </span>
              </li>
              <li className="flex gap-3">
                <AlertTriangle className="mt-0.5 shrink-0 text-rose-300" size={16} />
                <span>
                  <strong>Absent</strong> — no work submission on a working day
                </span>
              </li>
              <li className="flex gap-3">
                <Palmtree className="mt-0.5 shrink-0 text-sky-300" size={16} />
                <span>
                  <strong>On leave</strong> — approved leave request
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Month stats */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card-surface p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Presence rate
          </p>
          <p className="font-display mt-2 text-4xl text-stone-900">{summary.presenceRate}%</p>
          <p className="mt-1 text-sm text-stone-500">
            {summary.worked} present days / {summary.countable || 0} working days
          </p>
        </div>
        {[
          ['present', summary.present, CheckCircle2],
          ['late', summary.late, Clock3],
          ['absent', summary.absent, AlertTriangle],
          ['on_leave', summary.on_leave, Palmtree],
        ].map(([key, value, Icon]) => {
          const meta = statusMeta(key);
          return (
            <div key={key} className={`rounded-2xl border p-4 ${meta.soft}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  {meta.label}
                </p>
                <Icon size={16} />
              </div>
              <p className="font-display mt-2 text-3xl">{value}</p>
              <p className="mt-1 text-xs opacity-80">{meta.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Calendar */}
        <div className="card-surface overflow-hidden p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl">Monthly calendar</h3>
            <div className="flex flex-wrap gap-2">
              {['present', 'late', 'absent', 'on_leave', 'holiday', 'weekend'].map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5 text-[11px] text-stone-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusMeta(s).color}`} />
                  {statusMeta(s).label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-stone-400">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <p className="py-10 text-center text-stone-500">Loading calendar…</p>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const row = byDate[key];
                const inMonth = isSameMonth(day, monthDate);
                const selectedDay = key === selectedDate;
                const meta = statusMeta(row?.status);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-[72px] rounded-2xl border p-2 text-left transition ${
                      selectedDay
                        ? 'border-teal-700 bg-teal-50 shadow-sm'
                        : inMonth
                          ? 'border-transparent bg-stone-50/80 hover:border-stone-200 hover:bg-white'
                          : 'border-transparent bg-transparent opacity-35'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`text-sm font-semibold ${
                          isToday(day) ? 'text-teal-800' : 'text-stone-800'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      {row ? (
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${meta.color}`} />
                      ) : null}
                    </div>
                    {row ? (
                      <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        {meta.label}
                      </p>
                    ) : isToday(day) ? (
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        Pending
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Day detail */}
        <div className="space-y-4">
          <div className="card-surface overflow-hidden">
            <div className={`border-b px-5 py-4 ${selectedMeta.soft}`}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                Selected day
              </p>
              <h3 className="font-display mt-1 text-2xl">
                {format(parseISO(selectedDate), 'EEEE, dd MMM yyyy')}
              </h3>
              <div className="mt-3">
                <Badge value={selected?.status || 'pending'} />
              </div>
            </div>
            <div className="space-y-4 p-5 text-sm">
              {selected ? (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Meaning
                    </p>
                    <p className="mt-1 text-stone-700">{selectedMeta.hint}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Source
                    </p>
                    <p className="mt-1 capitalize text-stone-700">
                      {String(selected.source || '').replaceAll('_', ' ') || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Remarks
                    </p>
                    <p className="mt-1 text-stone-700">{selected.remarks || 'No remarks'}</p>
                  </div>
                  {selected.workLog ? (
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Linked daily work
                      </p>
                      <p className="mt-1 font-semibold text-stone-900">
                        {selected.workLog.title || 'Work submitted'}
                      </p>
                      {selected.workLog.hoursWorked ? (
                        <p className="mt-1 text-stone-500">
                          {selected.workLog.hoursWorked} hours logged
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
                  <p className="font-semibold">No attendance record</p>
                  <p className="mt-1 text-sm opacity-90">
                    {selectedDate === todayKey
                      ? 'Submit your daily work to mark attendance for today.'
                      : 'No status was recorded for this date.'}
                  </p>
                  {selectedDate === todayKey ? (
                    <Link to="/app/work" className="btn-cta mt-4">
                      Submit work now
                    </Link>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="card-surface p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-teal-50 p-2 text-teal-800">
                <Info size={18} />
              </div>
              <div>
                <h4 className="font-display text-lg">Quick tip</h4>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">
                  Attendance is not a punch-in. Upload your daily work with screenshots/files. The
                  system marks Present or Late automatically from your submission time.
                </p>
              </div>
            </div>
          </div>

          <div className="card-surface table-wrap p-2">
            <div className="px-3 py-2">
              <h4 className="font-display text-lg">This month log</h4>
            </div>
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="text-stone-500">
                      No records in this month yet
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row._id}
                      className="cursor-pointer hover:bg-stone-50"
                      onClick={() => setSelectedDate(row.date)}
                    >
                      <td>{format(parseISO(row.date), 'dd MMM')}</td>
                      <td>
                        <Badge value={row.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
