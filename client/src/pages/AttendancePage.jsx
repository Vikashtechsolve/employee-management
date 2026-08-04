import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Palmtree,
  Upload,
} from 'lucide-react';
import api from '../api/client';
import { Badge, EmptyState, PageHeader, StatPill } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const STATUS_META = {
  present: {
    label: 'Present',
    color: 'bg-emerald-500',
    cal: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200',
    hint: 'Work submitted before cutoff',
  },
  late: {
    label: 'Late',
    color: 'bg-amber-500',
    cal: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
    hint: 'Work submitted after cutoff',
  },
  absent: {
    label: 'Absent',
    color: 'bg-rose-500',
    cal: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
    hint: 'No work submitted on a working day',
  },
  half_day: {
    label: 'Half day',
    color: 'bg-orange-500',
    cal: 'bg-orange-100 text-orange-900 ring-1 ring-orange-200',
    hint: 'Marked as half day',
  },
  on_leave: {
    label: 'On leave',
    color: 'bg-sky-500',
    cal: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
    hint: 'Approved leave for this day',
  },
  holiday: {
    label: 'Holiday',
    color: 'bg-violet-500',
    cal: 'bg-violet-50 text-violet-800 ring-1 ring-violet-100',
    hint: 'Company holiday',
  },
  weekend: {
    label: 'Weekend',
    color: 'bg-slate-400',
    cal: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
    hint: 'Non-working day',
  },
  unmarked: {
    label: 'Not marked',
    color: 'bg-slate-300',
    cal: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200',
    hint: 'No attendance recorded yet',
  },
};

function statusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status ? String(status).replaceAll('_', ' ') : 'Not marked',
      color: 'bg-slate-300',
      cal: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200',
      hint: 'Attendance not recorded yet',
    }
  );
}

function AttendanceMonthCalendar({
  monthDate,
  selectedDate,
  onMonthChange,
  onSelectDate,
  dayMap,
  today,
}) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function dayClass(key, inMonth) {
    if (!inMonth) return 'invisible';
    const d = dayMap[key];
    if (key === selectedDate) {
      return 'cursor-pointer bg-teal-600 text-white shadow-md ring-2 ring-teal-300 ring-offset-1';
    }
    if (!d || d.isFuture) {
      return 'cursor-pointer bg-slate-50 text-slate-400 hover:bg-slate-100';
    }
    const meta = statusMeta(d.status);
    return `cursor-pointer ${meta.cal} hover:opacity-90`;
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{format(monthDate, 'MMMM yyyy')}</p>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-secondary cursor-pointer px-2"
            onClick={() => onMonthChange(subMonths(monthDate, 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="btn btn-secondary cursor-pointer px-2"
            onClick={() => onMonthChange(addMonths(monthDate, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pt-3 text-center text-xs font-medium text-slate-400">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-3">
        {cells.map((cell) => {
          const key = format(cell, 'yyyy-MM-dd');
          const inMonth = isSameMonth(cell, monthDate);
          const d = dayMap[key];
          const meta = d?.status ? statusMeta(d.status) : null;
          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && onSelectDate(key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium transition ${dayClass(key, inMonth)}`}
            >
              {inMonth ? (
                <>
                  <span>{format(cell, 'd')}</span>
                  {meta && d.status && key !== selectedDate ? (
                    <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${meta.color}`} />
                  ) : null}
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
        {['present', 'late', 'absent', 'on_leave', 'weekend'].map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${statusMeta(s).color}`} />
            {statusMeta(s).label}
          </span>
        ))}
        <button
          type="button"
          className="ml-auto cursor-pointer font-semibold text-teal-700 hover:text-teal-800"
          onClick={() => onSelectDate(today)}
        >
          Today
        </button>
      </div>
    </div>
  );
}

function AttendanceDayPanel({ date, attendance, todayKey, todayWork, userCutoff }) {
  const wd = getDay(parseISO(date));
  const isWeekend = wd === 0 || wd === 6;
  const isToday = date === todayKey;
  const isFuture = date > todayKey;

  if (attendance) {
    const meta = statusMeta(attendance.status);
    return (
      <div className="card-surface overflow-hidden shadow-[var(--shadow-md)]">
        <div className={`border-b px-5 py-4 ${meta.cal}`}>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">
            {format(parseISO(date), 'EEEE, dd MMM yyyy')}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{meta.label}</h2>
          <div className="mt-2">
            <Badge value={attendance.status} />
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meaning</p>
            <p className="mt-1 text-sm text-slate-700">{meta.hint}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</p>
              <p className="mt-1 text-sm capitalize text-slate-800">
                {String(attendance.source || '').replaceAll('_', ' ') || '—'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recorded</p>
              <p className="mt-1 text-sm text-slate-800">
                {attendance.updatedAt
                  ? format(new Date(attendance.updatedAt), 'dd MMM yyyy · HH:mm')
                  : '—'}
              </p>
            </div>
          </div>

          {attendance.remarks ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
              <p className="mt-1 text-sm text-slate-700">{attendance.remarks}</p>
            </div>
          ) : null}

          {attendance.workLog ? (
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                Linked daily work
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {attendance.workLog.title || 'Work submitted'}
              </p>
              {attendance.workLog.hoursWorked ? (
                <p className="mt-1 text-sm text-slate-600">
                  {attendance.workLog.hoursWorked} hours logged
                </p>
              ) : null}
              <Link
                to="/app/work"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800"
              >
                View work submission <ArrowRight size={14} />
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (isToday) {
    return (
      <div className="card-surface overflow-hidden">
        <div className="border-b border-amber-100 bg-amber-50/80 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800">Today</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Not marked yet</h2>
          <div className="mt-2">
            <Badge value="pending" />
          </div>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            {todayWork
              ? 'Your work is saved. Attendance updates when your submission is complete.'
              : `Submit daily work with proof before ${userCutoff || '11:00'} to get Present.`}
          </p>
          <Link to="/app/work" className="btn btn-primary inline-flex cursor-pointer">
            <Upload size={16} />
            {todayWork ? 'Update today’s work' : 'Submit today’s work'}
          </Link>
        </div>
      </div>
    );
  }

  const inferredKey = isWeekend ? 'weekend' : isFuture ? null : 'unmarked';
  const inferred = statusMeta(inferredKey || 'unmarked');

  return (
    <div className="card-surface overflow-hidden">
      <div className={`border-b px-5 py-4 ${inferred.cal}`}>
        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
          {format(parseISO(date), 'EEEE, dd MMM yyyy')}
        </p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">
          {isFuture ? 'Upcoming' : inferred.label}
        </h2>
        {!isFuture ? (
          <div className="mt-2">
            <Badge value={isWeekend ? 'weekend' : 'pending'} />
          </div>
        ) : null}
      </div>
      <div className="p-5">
        <p className="text-sm text-slate-600">
          {isFuture
            ? 'This date is in the future.'
            : inferred.hint}
        </p>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const monthFrom = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthTo = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const { data: rows = [], isLoading, isFetching } = useQuery({
    queryKey: ['my-attendance', monthFrom, monthTo],
    queryFn: async () =>
      (await api.get('/attendance/me', { params: { from: monthFrom, to: monthTo } })).data.data,
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

  const dayMap = useMemo(() => {
    const map = {};
    for (const d of eachDayOfInterval({ start: parseISO(monthFrom), end: parseISO(monthTo) })) {
      const key = format(d, 'yyyy-MM-dd');
      const wd = getDay(d);
      const isWeekend = wd === 0 || wd === 6;
      const att = byDate[key];
      const status = att?.status || (isWeekend ? 'weekend' : key > todayKey ? null : 'unmarked');
      map[key] = {
        status,
        isFuture: key > todayKey,
        weekday: !isWeekend,
        attendanceRow: att || null,
      };
    }
    return map;
  }, [byDate, monthFrom, monthTo, todayKey]);

  const summary = useMemo(() => {
    const counts = {
      present: 0,
      late: 0,
      absent: 0,
      on_leave: 0,
      half_day: 0,
      holiday: 0,
      unmarked: 0,
    };
    let workDays = 0;

    for (const d of Object.values(dayMap)) {
      if (d.isFuture || d.status === 'weekend') continue;
      workDays += 1;
      if (d.status && counts[d.status] !== undefined) counts[d.status] += 1;
    }

    const worked = counts.present + counts.late + counts.half_day;
    const countable = worked + counts.absent + counts.unmarked;
    const presenceRate = countable > 0 ? Math.round((worked / countable) * 100) : 0;

    return { ...counts, worked, workDays, presenceRate, recorded: rows.length };
  }, [dayMap, rows.length]);

  const monthTimeline = useMemo(
    () => [...rows].sort((a, b) => b.date.localeCompare(a.date)),
    [rows]
  );

  const selectedAttendance = byDate[selectedDate] || null;
  const todayAttendance = byDate[todayKey];
  const todayMeta = statusMeta(todayAttendance?.status || 'unmarked');

  return (
    <div className="space-y-5">
      <PageHeader
        title="My attendance"
        subtitle="Track how your daily work submissions become attendance"
        actions={
          <Link to="/app/work" className="btn btn-secondary cursor-pointer">
            <ClipboardList size={16} /> Daily work
          </Link>
        }
      />

      {/* Month overview */}
      <div className="hero-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              {format(monthDate, 'MMMM yyyy')}
              {isFetching ? ' · updating…' : ''}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {summary.presenceRate}% presence rate
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Today:{' '}
              {todayAttendance
                ? todayMeta.label
                : todayWork
                  ? 'Work saved — attendance pending'
                  : 'Submit work to mark attendance'}
              {user?.cutoffTime ? ` · Cutoff ${user.cutoffTime}` : ''}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <StatPill label="Present" value={summary.present} tone="ok" />
            <StatPill label="Late" value={summary.late} tone="warn" />
            <StatPill label="Absent" value={summary.absent} tone="danger" />
            <StatPill label="On leave" value={summary.on_leave} tone="sky" />
            <StatPill label="Half day" value={summary.half_day} tone="neutral" />
            <StatPill label="Work days" value={summary.workDays} tone="brand" />
            <StatPill label="Recorded" value={summary.recorded} tone="neutral" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-teal-100 pt-4">
          <Link to="/app/work" className="btn btn-primary cursor-pointer">
            <Upload size={16} />
            {todayWork ? 'Update today’s work' : 'Submit today’s work'}
          </Link>
          <Link to="/app/leaves" className="btn btn-secondary cursor-pointer">
            <Palmtree size={16} /> Apply leave
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        {/* Calendar column */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="card-surface p-8 text-center text-sm text-slate-500">
              Loading calendar…
            </div>
          ) : (
            <AttendanceMonthCalendar
              monthDate={monthDate}
              selectedDate={selectedDate}
              onMonthChange={setMonthDate}
              onSelectDate={setSelectedDate}
              dayMap={dayMap}
              today={todayKey}
            />
          )}

          <div className="card-surface overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">This month</p>
              <p className="text-xs text-slate-500">{monthTimeline.length} recorded days</p>
            </div>
            <ul className="max-h-56 divide-y divide-slate-100 overflow-auto">
              {monthTimeline.length === 0 ? (
                <li className="p-4 text-sm text-slate-500">No records this month yet</li>
              ) : (
                monthTimeline.map((row) => {
                  const meta = statusMeta(row.status);
                  return (
                    <li key={row._id}>
                      <button
                        type="button"
                        onClick={() => setSelectedDate(row.date)}
                        className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                          row.date === selectedDate ? 'bg-teal-50' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {format(parseISO(row.date), 'dd MMM · EEEE')}
                          </p>
                          <p className="truncate text-xs capitalize text-slate-500">
                            {String(row.source || '').replaceAll('_', ' ')}
                            {row.remarks ? ` · ${row.remarks}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${meta.color}`} />
                          <Badge value={row.status} />
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>

        {/* Day detail + help */}
        <div className="space-y-4">
          <AttendanceDayPanel
            date={selectedDate}
            attendance={selectedAttendance}
            todayKey={todayKey}
            todayWork={todayWork}
            userCutoff={user?.cutoffTime}
          />

          <div className="card-surface p-5">
            <p className="text-sm font-semibold text-slate-900">How attendance works</p>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                <span>
                  <strong className="text-slate-800">Present</strong> — submit work before cutoff (
                  {user?.cutoffTime || '11:00'})
                </span>
              </li>
              <li className="flex gap-2.5">
                <Clock3 className="mt-0.5 shrink-0 text-amber-600" size={16} />
                <span>
                  <strong className="text-slate-800">Late</strong> — submit after cutoff same day
                </span>
              </li>
              <li className="flex gap-2.5">
                <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={16} />
                <span>
                  <strong className="text-slate-800">Absent</strong> — no submission on a working day
                </span>
              </li>
              <li className="flex gap-2.5">
                <Palmtree className="mt-0.5 shrink-0 text-sky-600" size={16} />
                <span>
                  <strong className="text-slate-800">On leave</strong> — approved leave request
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {!isLoading && monthTimeline.length === 0 ? (
        <EmptyState
          title="No attendance this month yet"
          hint="Submit your daily work with proof — attendance is marked automatically."
        />
      ) : null}
    </div>
  );
}
