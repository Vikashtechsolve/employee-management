import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  AlertCircle,
  ClipboardCheck,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  Search,
  Lock,
  Eye,
  Users,
  Ticket,
  Umbrella,
  CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, PageHeader, StatCard } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import EmployeeDashboard from './EmployeeDashboard';

function CompletionRing({ value, size = 'md' }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  const dim = size === 'sm' ? 'h-24 w-24' : 'h-36 w-36';
  const text = size === 'sm' ? 'text-2xl' : 'text-3xl';
  return (
    <div className={`relative mx-auto ${dim}`}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e7e0d5" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#0f766e"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className={`font-display ${text} text-stone-900`}>{value}%</p>
        {size !== 'sm' ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
            Submitted
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MetricPill({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white border-stone-200 text-stone-800',
    ok: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warn: 'bg-amber-50 border-amber-200 text-amber-950',
    danger: 'bg-rose-50 border-rose-200 text-rose-900',
    brand: 'bg-teal-50 border-teal-200 text-teal-950',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">{label}</p>
      <p className="font-display mt-1 text-2xl">{value}</p>
    </div>
  );
}

function dayTone(day) {
  if (day.isFuture) return 'future';
  if (day.rate >= 90) return 'great';
  if (day.rate >= 50) return 'ok';
  if (day.submitted > 0) return 'low';
  return 'none';
}

function AdminCalendar({ monthDate, selectedDate, onMonthChange, onSelectDate, dayStats, today }) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const cells = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const statsMap = useMemo(() => {
    const map = {};
    for (const d of dayStats || []) map[d.date] = d;
    return map;
  }, [dayStats]);

  const toneClass = {
    great: 'bg-emerald-600 text-white hover:bg-emerald-700',
    ok: 'bg-amber-400 text-stone-900 hover:bg-amber-500',
    low: 'bg-orange-300 text-stone-900 hover:bg-orange-400',
    none: 'bg-rose-100 text-rose-900 hover:bg-rose-200',
    future: 'bg-stone-100 text-stone-400',
  };

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Calendar</p>
          <p className="font-display text-xl text-stone-900">{format(monthDate, 'MMMM yyyy')}</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            className="btn btn-secondary px-2"
            onClick={() => onMonthChange(subMonths(monthDate, 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="btn btn-secondary px-2"
            onClick={() => onMonthChange(addMonths(monthDate, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pt-3 text-center text-[10px] font-bold uppercase tracking-wide text-stone-400">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-3">
        {cells.map((cell) => {
          const key = format(cell, 'yyyy-MM-dd');
          const inMonth = isSameMonth(cell, monthDate);
          const selected = key === selectedDate;
          const isTodayCell = key === today;
          const stat = statsMap[key];
          const tone = stat ? dayTone(stat) : inMonth ? 'none' : 'future';

          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && onSelectDate(key)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs font-semibold transition ${
                !inMonth
                  ? 'invisible'
                  : selected
                    ? 'ring-2 ring-teal-900 ring-offset-2'
                    : ''
              } ${toneClass[tone] || toneClass.future}`}
            >
              <span>{format(cell, 'd')}</span>
              {inMonth && stat && !stat.isFuture ? (
                <span className="mt-0.5 text-[9px] font-bold opacity-90">{stat.rate}%</span>
              ) : null}
              {isTodayCell && inMonth ? (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-white" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-[var(--line)] px-4 py-3 text-[10px] text-stone-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-emerald-600" /> 90%+
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-amber-400" /> 50%+
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded bg-rose-200" /> Low
        </span>
        <button
          type="button"
          className="ml-auto font-semibold text-teal-800"
          onClick={() => onSelectDate(today)}
        >
          Jump to today
        </button>
      </div>
    </div>
  );
}

function AdminWorkDashboard({ data }) {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date') || data.today;
  const [monthDate, setMonthDate] = useState(startOfMonth(parseISO(date)));
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');

  const monthKey = format(monthDate, 'yyyy-MM');

  const { data: calendarData } = useQuery({
    queryKey: ['admin-calendar', monthKey],
    queryFn: async () =>
      (await api.get('/dashboard/calendar', { params: { month: monthKey } })).data.data,
  });

  const { data: board, isFetching } = useQuery({
    queryKey: ['admin-work-board', date],
    queryFn: async () =>
      (await api.get('/worklogs/board', { params: { date } })).data.data,
  });

  const rows = board?.rows || [];
  const summary = board?.summary;

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === 'submitted') list = list.filter((r) => r.submitted);
    if (tab === 'missing') list = list.filter((r) => r.missing);
    if (tab === 'unreviewed') {
      list = list.filter((r) => r.submitted && !r.workLog?.reviewedAt);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.employee.name?.toLowerCase().includes(q) ||
          r.employee.employeeId?.toLowerCase().includes(q) ||
          r.employee.department?.name?.toLowerCase().includes(q) ||
          r.workLog?.title?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, tab, search]);

  const selected = useMemo(
    () => filtered.find((r) => r.employee.id === selectedId) || filtered[0] || null,
    [filtered, selectedId]
  );

  useEffect(() => {
    setNote(selected?.workLog?.adminNote || '');
  }, [selected?.employee?.id, selected?.workLog?.adminNote]);

  useEffect(() => {
    setMonthDate(startOfMonth(parseISO(date)));
  }, [date]);

  const reviewMutation = useMutation({
    mutationFn: async ({ id, payload }) => api.patch(`/worklogs/${id}/review`, payload),
    onSuccess: () => {
      toast.success('Work updated');
      qc.invalidateQueries({ queryKey: ['admin-work-board'] });
      qc.invalidateQueries({ queryKey: ['admin-calendar'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['work-board'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  function selectDate(next) {
    setSearchParams({ date: next });
    setSelectedId(null);
  }

  const chartData = (data.weeklyTrend || []).map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'EEE'),
  }));

  const selectedDayStat = calendarData?.days?.find((d) => d.date === date);

  return (
    <div className="space-y-5">
      <section className="hero-panel-accent p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              Admin console
            </p>
            <h1 className="font-display mt-2 text-3xl text-slate-900 sm:text-4xl">
              {format(parseISO(date), 'EEEE, dd MMMM yyyy')}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Select a date on the calendar to review employee work and attendance
              {isFetching ? ' · refreshing…' : ''}
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-teal-100">
            <CompletionRing
              value={summary?.completionRate ?? selectedDayStat?.rate ?? 0}
              size="sm"
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
                <p className="text-emerald-700/80">Submitted</p>
                <p className="font-display text-xl text-emerald-900">
                  {summary?.submitted ?? selectedDayStat?.submitted ?? 0}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-100">
                <p className="text-amber-700/80">Missing</p>
                <p className="font-display text-xl text-amber-900">
                  {summary?.missing ?? selectedDayStat?.missing ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <AdminCalendar
            monthDate={monthDate}
            selectedDate={date}
            onMonthChange={setMonthDate}
            onSelectDate={selectDate}
            dayStats={calendarData?.days}
            today={data.today}
          />

          <div className="card-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Org snapshot
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MetricPill label="Employees" value={data.activeEmployees} tone="brand" />
              <MetricPill label="Present rate" value={`${data.presentRate}%`} tone="ok" />
              <MetricPill label="Open tickets" value={data.openTickets} tone="warn" />
              <MetricPill label="Pending leave" value={data.pendingLeaves} tone="neutral" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricPill
              label="Completion"
              value={`${summary?.completionRate ?? 0}%`}
              tone="brand"
            />
            <MetricPill label="Missing" value={summary?.missing ?? 0} tone="warn" />
            <MetricPill label="Unreviewed" value={summary?.unreviewed ?? 0} tone="danger" />
            <MetricPill
              label="Late"
              value={summary?.late ?? data.attendanceToday?.late ?? 0}
              tone="neutral"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
            <div className="card-surface overflow-hidden">
              <div className="border-b border-[var(--line)] p-4">
                <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--line)] bg-white p-1">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'submitted', label: 'Submitted' },
                    { id: 'missing', label: 'Missing' },
                    { id: 'unreviewed', label: 'Unreviewed' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTab(t.id);
                        setSelectedId(null);
                      }}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                        tab === t.id
                          ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="relative mt-3">
                  <Search
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    className="input input-icon-left"
                    placeholder="Search employee or work…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="max-h-[480px] overflow-auto p-2">
                {filtered.length === 0 ? (
                  <EmptyState title="No employees" hint="Try another filter or date." />
                ) : (
                  <ul className="space-y-2">
                    {filtered.map((row) => {
                      const active = selected?.employee.id === row.employee.id;
                      return (
                        <li key={row.employee.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(row.employee.id);
                              setNote(row.workLog?.adminNote || '');
                            }}
                            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                              active
                                ? 'bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-200'
                                : 'border-[var(--line)] bg-white hover:border-teal-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-stone-900">
                                  {row.employee.name}
                                </p>
                                <p className="text-xs text-stone-500">
                                  {row.employee.employeeId}
                                  {row.employee.department?.name
                                    ? ` · ${row.employee.department.name}`
                                    : ''}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                {row.attendance?.status ? (
                                  <Badge value={row.attendance.status} />
                                ) : (
                                  <span className="badge bg-stone-100 text-stone-600">—</span>
                                )}
                                {row.submitted ? (
                                  <span className="text-[10px] font-bold uppercase text-emerald-700">
                                    Submitted
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase text-amber-700">
                                    Missing
                                  </span>
                                )}
                              </div>
                            </div>
                            {row.workLog?.title ? (
                              <p className="mt-2 truncate text-sm text-stone-600">
                                {row.workLog.title}
                              </p>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="card-surface min-h-[480px] overflow-hidden">
              {!selected ? (
                <div className="flex h-full min-h-[480px] flex-col items-center justify-center gap-3 p-8 text-center text-stone-500">
                  <Users size={32} className="text-stone-300" />
                  <p className="font-display text-xl text-stone-700">Select an employee</p>
                  <p className="max-w-xs text-sm">
                    Pick someone from the list to review their work for{' '}
                    {format(parseISO(date), 'dd MMM')}.
                  </p>
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <header className="detail-header">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
                          {format(parseISO(date), 'dd MMM yyyy')}
                        </p>
                        <h3 className="font-display mt-1 text-2xl text-slate-900">
                          {selected.employee.name}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {selected.employee.employeeId}
                          {selected.employee.department?.name
                            ? ` · ${selected.employee.department.name}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selected.attendance?.status ? (
                          <Badge value={selected.attendance.status} />
                        ) : null}
                        <Badge value={selected.submitted ? 'submitted' : 'pending'} />
                      </div>
                    </div>
                  </header>

                  {!selected.workLog ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                      <AlertCircle className="text-amber-500" size={32} />
                      <p className="font-display text-2xl text-stone-900">No work submitted</p>
                      <p className="max-w-sm text-sm text-stone-500">
                        This employee has not submitted daily work for this date.
                      </p>
                      <Link
                        to={`/app/team/worklogs?date=${date}&employee=${selected.employee.id}`}
                        className="btn btn-secondary"
                      >
                        Open in Employee Work
                      </Link>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-4 overflow-auto p-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                          Task
                        </p>
                        <p className="font-display mt-1 text-xl">{selected.workLog.title}</p>
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-stone-600">
                        <span className="inline-flex items-center gap-1">
                          <ClipboardCheck size={14} /> {selected.workLog.hoursWorked}h
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Paperclip size={14} /> {selected.workLog.attachments?.length || 0}{' '}
                          files
                        </span>
                        {selected.workLog.locked ? (
                          <span className="inline-flex items-center gap-1 text-amber-700">
                            <Lock size={14} /> Locked
                          </span>
                        ) : null}
                        {selected.workLog.reviewedAt ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 size={14} /> Reviewed
                          </span>
                        ) : null}
                      </div>

                      <div className="max-h-40 overflow-auto whitespace-pre-wrap rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-700">
                        {selected.workLog.description}
                      </div>

                      {(selected.workLog.attachments || []).length > 0 ? (
                        <ul className="space-y-1 text-sm">
                          {selected.workLog.attachments.map((a) => (
                            <li
                              key={a.key}
                              className="flex justify-between rounded-xl bg-stone-50 px-3 py-2"
                            >
                              <span className="truncate">{a.originalName}</span>
                              <span className="text-xs text-stone-500">
                                {Math.max(1, Math.round(a.size / 1024))} KB
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <label className="block text-sm font-medium">
                        Admin note
                        <textarea
                          className="textarea mt-1"
                          placeholder="Review notes…"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-cta"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({
                              id: selected.workLog._id,
                              payload: { reviewed: true, adminNote: note, locked: true },
                            })
                          }
                        >
                          <CheckCircle2 size={16} /> Review & lock
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={reviewMutation.isPending}
                          onClick={() =>
                            reviewMutation.mutate({
                              id: selected.workLog._id,
                              payload: { reviewed: true, adminNote: note },
                            })
                          }
                        >
                          Mark reviewed
                        </button>
                        <Link
                          to={`/app/team/worklogs?date=${date}&employee=${selected.employee.id}`}
                          className="btn btn-secondary"
                        >
                          <Eye size={16} /> Full view
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h3 className="font-display text-xl">7-day submission trend</h3>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d5" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#78716c', fontSize: 12 }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#78716c', fontSize: 12 }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e7e0d5',
                    background: '#fffcf7',
                  }}
                  formatter={(value) => [value, 'Submitted']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
                />
                <Bar dataKey="submitted" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="font-display text-xl">By department · today</h3>
          <ul className="mt-4 space-y-3">
            {(data.byDepartment || []).length === 0 ? (
              <li className="text-sm text-stone-500">No department data</li>
            ) : (
              data.byDepartment.map((d) => (
                <li key={d.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-semibold">{d.name}</span>
                    <span className="text-stone-500">
                      {d.submitted}/{d.total} · {d.rate}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-teal-700 transition-all"
                      style={{ width: `${d.rate}%` }}
                    />
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/app/tickets"
          className="card-surface flex items-center gap-3 p-4 transition hover:border-teal-700/30"
        >
          <Ticket className="text-teal-800" size={20} />
          <div>
            <p className="text-xs text-stone-500">Open tickets</p>
            <p className="font-display text-xl">{data.openTickets}</p>
          </div>
        </Link>
        <Link
          to="/app/tickets"
          className="card-surface flex items-center gap-3 p-4 transition hover:border-teal-700/30"
        >
          <AlertCircle className="text-rose-600" size={20} />
          <div>
            <p className="text-xs text-stone-500">Overdue</p>
            <p className="font-display text-xl">{data.overdueTickets}</p>
          </div>
        </Link>
        <Link
          to="/app/team/leaves"
          className="card-surface flex items-center gap-3 p-4 transition hover:border-teal-700/30"
        >
          <Umbrella className="text-sky-700" size={20} />
          <div>
            <p className="text-xs text-stone-500">Leave approvals</p>
            <p className="font-display text-xl">{data.pendingLeaves}</p>
          </div>
        </Link>
        <Link
          to="/app/team/worklogs"
          className="card-surface flex items-center gap-3 p-4 transition hover:border-teal-700/30"
        >
          <CalendarDays className="text-teal-800" size={20} />
          <div>
            <p className="text-xs text-stone-500">Employee work</p>
            <p className="text-sm font-semibold text-teal-900">Open board</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get('/dashboard')).data.data,
  });

  if (isLoading || !data) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">Loading dashboard…</div>
    );
  }

  if (data.role === 'admin') {
    return <AdminWorkDashboard data={data} />;
  }

  if (data.role === 'employee') {
    return <EmployeeDashboard user={user} data={data} />;
  }

  return (
    <div>
      <PageHeader
        title="Team dashboard"
        subtitle={`Today · ${data.today}`}
        actions={
          <Link to="/app/team/worklogs" className="btn btn-primary">
            Review team work
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Team size" value={data.teamSize} />
        <StatCard label="Present / late today" value={data.presentToday} />
        <StatCard label="Pending leave approvals" value={data.pendingLeaves?.length || 0} />
        <StatCard label="Overdue tickets" value={data.overdueCount || 0} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-xl">Today&apos;s submissions</h3>
            <Link to="/app/team/worklogs" className="text-sm font-semibold text-teal-800">
              View all
            </Link>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {(data.submissions || []).map((w) => (
              <li key={w._id} className="flex justify-between gap-2">
                <span className="font-medium">{w.employee?.name}</span>
                <span className="truncate text-stone-500">{w.title}</span>
              </li>
            ))}
            {!data.submissions?.length ? (
              <li className="text-stone-500">No submissions yet</li>
            ) : null}
          </ul>
        </div>
        <div className="card-surface p-5">
          <h3 className="font-display text-xl">Pending leaves</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {(data.pendingLeaves || []).map((l) => (
              <li key={l._id} className="flex justify-between">
                <span>
                  {l.employee?.name} · {l.leaveType?.name}
                </span>
                <span className="text-stone-500">
                  {l.startDate} → {l.endDate}
                </span>
              </li>
            ))}
            {!data.pendingLeaves?.length ? (
              <li className="text-stone-500">Nothing pending</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
