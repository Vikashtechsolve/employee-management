import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Search,
  UserRound,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, PageHeader } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const WORK_ROLES = new Set(['employee', 'manager', 'hr']);

const STATUS_META = {
  present: {
    label: 'Present',
    color: 'bg-emerald-500',
    soft: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    cal: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200',
  },
  late: {
    label: 'Late',
    color: 'bg-amber-500',
    soft: 'bg-amber-100 text-amber-900 ring-amber-200',
    cal: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
  },
  absent: {
    label: 'Absent',
    color: 'bg-rose-500',
    soft: 'bg-rose-100 text-rose-800 ring-rose-200',
    cal: 'bg-rose-100 text-rose-800 ring-1 ring-rose-200',
  },
  half_day: {
    label: 'Half day',
    color: 'bg-orange-500',
    soft: 'bg-orange-100 text-orange-900 ring-orange-200',
    cal: 'bg-orange-100 text-orange-900 ring-1 ring-orange-200',
  },
  on_leave: {
    label: 'On leave',
    color: 'bg-sky-500',
    soft: 'bg-sky-100 text-sky-900 ring-sky-200',
    cal: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
  },
  holiday: {
    label: 'Holiday',
    color: 'bg-violet-500',
    soft: 'bg-violet-100 text-violet-900 ring-violet-200',
    cal: 'bg-violet-50 text-violet-800 ring-1 ring-violet-100',
  },
  weekend: {
    label: 'Weekend',
    color: 'bg-slate-400',
    soft: 'bg-slate-100 text-slate-600 ring-slate-200',
    cal: 'bg-slate-50 text-slate-500 ring-1 ring-slate-200',
  },
  unmarked: {
    label: 'Not marked',
    color: 'bg-slate-300',
    soft: 'bg-slate-50 text-slate-600 ring-slate-200',
    cal: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200',
  },
};

function statusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status ? String(status).replaceAll('_', ' ') : 'Not marked',
      color: 'bg-slate-300',
      soft: 'bg-slate-50 text-slate-600 ring-slate-200',
      cal: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200',
    }
  );
}

function Stat({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-slate-50 text-slate-800 ring-slate-200',
    ok: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    warn: 'bg-amber-50 text-amber-900 ring-amber-100',
    danger: 'bg-rose-50 text-rose-800 ring-rose-100',
    brand: 'bg-teal-50 text-teal-800 ring-teal-100',
    sky: 'bg-sky-50 text-sky-800 ring-sky-100',
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${tones[tone]}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
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
          const meta = d ? statusMeta(d.status) : null;
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
                  {d && meta && key !== selectedDate ? (
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

function AttendanceDayPanel({
  employee,
  date,
  attendance,
  inferredStatus,
  onOverride,
  overriding,
}) {
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({ status: 'present', reason: '' });

  useEffect(() => {
    setOverrideOpen(false);
    setOverrideForm({
      status: attendance?.status || inferredStatus || 'present',
      reason: '',
    });
  }, [employee?.id, date, attendance?._id, attendance?.status, inferredStatus]);

  if (!employee) {
    return (
      <div className="card-surface flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
        <Users size={36} className="text-slate-300" />
        <p className="mt-3 text-lg font-semibold text-slate-800">Select an employee</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Choose someone from the list to view their monthly attendance calendar.
        </p>
      </div>
    );
  }

  const status = attendance?.status || inferredStatus;
  const meta = statusMeta(status);

  return (
    <div className="card-surface overflow-hidden shadow-[var(--shadow-md)]">
      <div className={`border-b px-5 py-4 ring-1 ring-inset ${meta.soft}`}>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-base font-semibold text-white">
            {(employee.name || '?').slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              {format(parseISO(date), 'EEEE, dd MMM yyyy')}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{employee.name}</h2>
            <p className="text-sm text-slate-600">
              {employee.employeeId}
              {employee.department?.name ? ` · ${employee.department.name}` : ''}
            </p>
          </div>
          {status ? <Badge value={status} /> : null}
        </div>
      </div>

      <div className="space-y-4 p-5">
        {attendance ? (
          <>
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

            {attendance.overrideReason ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Manual override
                </p>
                <p className="mt-1 text-sm text-amber-900">{attendance.overrideReason}</p>
                {attendance.overrideBy?.name ? (
                  <p className="mt-1 text-xs text-amber-700">By {attendance.overrideBy.name}</p>
                ) : null}
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
                {attendance.workLog.submittedAt ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Submitted {format(new Date(attendance.workLog.submittedAt), 'dd MMM · HH:mm')}
                  </p>
                ) : null}
                <Link
                  to={`/app/team/work?mode=employee&employee=${employee.id}&date=${date}`}
                  className="mt-3 inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800"
                >
                  View work submission →
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
            <AlertCircle size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 font-semibold text-slate-800">No attendance record</p>
            <p className="mt-1 text-sm text-slate-500">
              {inferredStatus === 'weekend'
                ? 'This is a weekend — no attendance expected.'
                : date > format(new Date(), 'yyyy-MM-dd')
                  ? 'This date is in the future.'
                  : 'No status was recorded for this working day yet.'}
            </p>
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between text-left"
            onClick={() => setOverrideOpen((v) => !v)}
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">Override attendance</p>
              <p className="text-xs text-slate-500">Manually set status for this day</p>
            </div>
            <ChevronRight
              size={18}
              className={`text-slate-400 transition ${overrideOpen ? 'rotate-90' : ''}`}
            />
          </button>

          {overrideOpen ? (
            <form
              className="mt-4 grid gap-3 border-t border-slate-100 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                onOverride({
                  employeeId: employee.id,
                  date,
                  status: overrideForm.status,
                  reason: overrideForm.reason,
                });
              }}
            >
              <select
                className="select cursor-pointer text-sm"
                value={overrideForm.status}
                onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
              >
                {['present', 'late', 'absent', 'half_day', 'on_leave'].map((s) => (
                  <option key={s} value={s}>
                    {statusMeta(s).label}
                  </option>
                ))}
              </select>
              <input
                className="input text-sm"
                placeholder="Reason for override (required)"
                required
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
              />
              <button className="btn btn-primary cursor-pointer" type="submit" disabled={overriding}>
                {overriding ? 'Saving…' : 'Save override'}
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default function TeamAttendancePage() {
  const isAdminLike = useAuthStore((s) => s.isAdminLike());
  const isManager = useAuthStore((s) => s.isManagerPlus());
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [mode, setMode] = useState(searchParams.get('mode') || 'employee');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(searchParams.get('employee') || '');
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  );

  const [boardDate, setBoardDate] = useState(
    searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  );
  const [boardSearch, setBoardSearch] = useState('');
  const [boardStatus, setBoardStatus] = useState('');

  const monthFrom = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthTo = format(endOfMonth(monthDate), 'yyyy-MM-dd');
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data.data,
    enabled: isAdminLike,
  });

  const { data: employees = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['attendance-review-employees', isAdminLike],
    queryFn: async () => {
      if (isAdminLike) {
        const res = await api.get('/users', { params: { limit: 200, isActive: 'true' } });
        return res.data.data.filter((u) => WORK_ROLES.has(u.role));
      }
      return (await api.get('/users/team')).data.data;
    },
    enabled: isManager,
  });

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (department) list = list.filter((e) => String(e.department?._id || e.department) === department);
    if (employeeSearch.trim()) {
      const q = employeeSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.name?.toLowerCase().includes(q) ||
          e.employeeId?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, department, employeeSearch]);

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const { data: monthAttendance = [], isFetching: fetchingAttendance } = useQuery({
    queryKey: ['employee-month-attendance-panel', selectedEmployeeId, monthFrom, monthTo],
    queryFn: async () =>
      selectedEmployeeId
        ? (
            await api.get('/attendance', {
              params: {
                employee: selectedEmployeeId,
                from: monthFrom,
                to: monthTo,
                limit: 62,
              },
            })
          ).data.data
        : [],
    enabled: Boolean(selectedEmployeeId) && mode === 'employee',
  });

  const dayMap = useMemo(() => {
    const map = {};
    const attByDate = Object.fromEntries(monthAttendance.map((a) => [a.date, a]));

    for (const d of eachDayOfInterval({ start: parseISO(monthFrom), end: parseISO(monthTo) })) {
      const key = format(d, 'yyyy-MM-dd');
      const wd = getDay(d);
      const isWeekend = wd === 0 || wd === 6;
      const att = attByDate[key];
      const status = att?.status || (isWeekend ? 'weekend' : key > today ? null : 'unmarked');
      map[key] = {
        status,
        isFuture: key > today,
        weekday: !isWeekend,
        attendanceRow: att || null,
      };
    }
    return map;
  }, [monthAttendance, monthFrom, monthTo, today]);

  const monthStats = useMemo(() => {
    const counts = {
      present: 0,
      late: 0,
      absent: 0,
      half_day: 0,
      on_leave: 0,
      holiday: 0,
      unmarked: 0,
    };
    let workDays = 0;

    for (const d of Object.values(dayMap)) {
      if (d.isFuture || d.status === 'weekend') continue;
      workDays += 1;
      if (d.status && counts[d.status] !== undefined) counts[d.status] += 1;
      else if (!d.attendanceRow) counts.unmarked += 1;
    }

    const worked = counts.present + counts.late + counts.half_day;
    const countable = worked + counts.absent + counts.unmarked;
    const presenceRate = countable > 0 ? Math.round((worked / countable) * 100) : 0;

    return { ...counts, worked, workDays, presenceRate };
  }, [dayMap]);

  const selectedDay = dayMap[selectedDate];
  const selectedAttendance = selectedDay?.attendanceRow || null;
  const inferredStatus = selectedDay?.status || null;

  useEffect(() => {
    if (!selectedEmployeeId && filteredEmployees.length) {
      const fromUrl = searchParams.get('employee');
      const match = fromUrl && filteredEmployees.find((e) => e.id === fromUrl);
      if (match) setSelectedEmployeeId(match.id);
    }
  }, [filteredEmployees, selectedEmployeeId, searchParams]);

  const overrideMutation = useMutation({
    mutationFn: (payload) => api.post('/attendance/override', payload),
    onSuccess: () => {
      toast.success('Attendance updated');
      qc.invalidateQueries({ queryKey: ['employee-month-attendance-panel'] });
      qc.invalidateQueries({ queryKey: ['team-attendance-board'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  function selectEmployee(id) {
    setSelectedEmployeeId(id);
    setSearchParams({ mode: 'employee', employee: id, date: selectedDate });
  }

  function selectDate(date) {
    setSelectedDate(date);
    if (selectedEmployeeId) {
      setSearchParams({ mode: 'employee', employee: selectedEmployeeId, date });
    }
  }

  const { data: boardAttendance = [], isLoading: loadingBoard } = useQuery({
    queryKey: ['team-attendance-board', boardDate, department],
    queryFn: async () =>
      (
        await api.get('/attendance', {
          params: {
            date: boardDate,
            department: department || undefined,
            limit: 200,
          },
        })
      ).data.data,
    enabled: mode === 'daily',
  });

  const boardRowsAll = useMemo(() => {
    const attByEmp = Object.fromEntries(
      boardAttendance.map((a) => [String(a.employee?._id || a.employee), a])
    );
    const wd = getDay(parseISO(boardDate));
    const isWeekend = wd === 0 || wd === 6;
    const isFuture = boardDate > today;

    return filteredEmployees.map((emp) => {
      const att = attByEmp[emp.id] || null;
      let status = att?.status || null;
      if (!status) {
        if (isWeekend) status = 'weekend';
        else if (!isFuture) status = 'unmarked';
      }
      return { employee: emp, attendance: att, status };
    });
  }, [filteredEmployees, boardAttendance, boardDate, today]);

  const boardRows = useMemo(() => {
    let rows = boardRowsAll;
    if (boardSearch.trim()) {
      const q = boardSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.employee.name?.toLowerCase().includes(q) ||
          r.employee.employeeId?.toLowerCase().includes(q)
      );
    }
    if (boardStatus) {
      rows = rows.filter((r) => r.status === boardStatus);
    }
    return rows;
  }, [boardRowsAll, boardSearch, boardStatus]);

  const boardStats = useMemo(() => {
    const counts = { present: 0, late: 0, absent: 0, on_leave: 0, unmarked: 0, weekend: 0 };
    for (const row of boardRowsAll) {
      if (row.status && counts[row.status] !== undefined) counts[row.status] += 1;
    }
    return {
      ...counts,
      total: boardRowsAll.length,
      marked: counts.present + counts.late + counts.absent + counts.on_leave,
    };
  }, [boardRowsAll]);

  const monthTimeline = useMemo(() => {
    return monthAttendance
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [monthAttendance]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={isAdminLike ? 'Team Attendance' : 'Team Attendance'}
        subtitle="Review monthly attendance by employee or browse the daily team board"
        actions={
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setMode('employee')}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === 'employee'
                  ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <UserRound size={16} /> By employee
            </button>
            <button
              type="button"
              onClick={() => setMode('daily')}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === 'daily'
                  ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <LayoutGrid size={16} /> Daily board
            </button>
          </div>
        }
      />

      {mode === 'employee' ? (
        <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
          <aside className="card-surface flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden">
            <div className="border-b border-slate-100 p-4">
              <p className="text-sm font-semibold text-slate-900">Employees</p>
              <p className="text-xs text-slate-500">{filteredEmployees.length} people</p>
              <div className="relative mt-3">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="input input-icon-left cursor-text text-sm"
                  placeholder="Search name or ID…"
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                />
              </div>
              {isAdminLike ? (
                <select
                  className="select mt-2 cursor-pointer text-sm"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  <option value="">All departments</option>
                  {(departments || []).map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            <ul className="flex-1 space-y-1 overflow-auto p-2">
              {loadingEmployees ? (
                <li className="p-4 text-sm text-slate-500">Loading…</li>
              ) : filteredEmployees.length === 0 ? (
                <li className="p-4 text-sm text-slate-500">No employees found</li>
              ) : (
                filteredEmployees.map((emp) => {
                  const active = emp.id === selectedEmployeeId;
                  return (
                    <li key={emp.id}>
                      <button
                        type="button"
                        onClick={() => selectEmployee(emp.id)}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                          active ? 'bg-teal-50 ring-1 ring-teal-200' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                            active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {(emp.name || '?').slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{emp.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            {emp.employeeId}
                            {emp.department?.name ? ` · ${emp.department.name}` : ''}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>

          <div className="space-y-4">
            {!selectedEmployee ? (
              <EmptyState
                title="Pick an employee"
                hint="Select someone from the list to see their full month of attendance."
              />
            ) : (
              <>
                <div className="hero-panel p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                        {format(monthDate, 'MMMM yyyy')}
                        {fetchingAttendance ? ' · updating…' : ''}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold text-slate-900">
                        {selectedEmployee.name}
                      </h2>
                      <p className="text-sm text-slate-600">
                        {selectedEmployee.employeeId}
                        {selectedEmployee.department?.name
                          ? ` · ${selectedEmployee.department.name}`
                          : ''}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                      <Stat label="Presence" value={`${monthStats.presenceRate}%`} tone="brand" />
                      <Stat label="Present" value={monthStats.present} tone="ok" />
                      <Stat label="Late" value={monthStats.late} tone="warn" />
                      <Stat label="Absent" value={monthStats.absent} tone="danger" />
                      <Stat label="On leave" value={monthStats.on_leave} tone="sky" />
                      <Stat label="Unmarked" value={monthStats.unmarked} tone="neutral" />
                      <Stat label="Work days" value={monthStats.workDays} tone="neutral" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
                  <AttendanceMonthCalendar
                    monthDate={monthDate}
                    selectedDate={selectedDate}
                    onMonthChange={setMonthDate}
                    onSelectDate={selectDate}
                    dayMap={dayMap}
                    today={today}
                  />

                  <div className="space-y-4">
                    <AttendanceDayPanel
                      employee={selectedEmployee}
                      date={selectedDate}
                      attendance={selectedAttendance}
                      inferredStatus={inferredStatus}
                      overriding={overrideMutation.isPending}
                      onOverride={(payload) => overrideMutation.mutate(payload)}
                    />

                    <div className="card-surface overflow-hidden">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">This month</p>
                        <p className="text-xs text-slate-500">
                          {monthTimeline.length} recorded days — click to open
                        </p>
                      </div>
                      <ul className="max-h-56 divide-y divide-slate-100 overflow-auto">
                        {monthTimeline.length === 0 ? (
                          <li className="p-4 text-sm text-slate-500">No records this month</li>
                        ) : (
                          monthTimeline.map((row) => {
                            const meta = statusMeta(row.status);
                            return (
                              <li key={row._id}>
                                <button
                                  type="button"
                                  onClick={() => selectDate(row.date)}
                                  className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                                    row.date === selectedDate ? 'bg-teal-50' : ''
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900">
                                      {format(parseISO(row.date), 'dd MMM yyyy · EEEE')}
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
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card-surface flex flex-wrap items-center gap-3 p-4">
            <CalendarDays size={18} className="text-teal-700" />
            <input
              className="input w-auto cursor-pointer text-sm"
              type="date"
              value={boardDate}
              onChange={(e) => setBoardDate(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary cursor-pointer text-sm"
              onClick={() => setBoardDate(today)}
            >
              Today
            </button>
            <div className="relative min-w-[180px] flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="input input-icon-left cursor-text text-sm"
                placeholder="Search employee…"
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
              />
            </div>
            <select
              className="select w-auto cursor-pointer text-sm"
              value={boardStatus}
              onChange={(e) => setBoardStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {['present', 'late', 'absent', 'on_leave', 'unmarked', 'weekend'].map((s) => (
                <option key={s} value={s}>
                  {statusMeta(s).label}
                </option>
              ))}
            </select>
            {isAdminLike ? (
              <select
                className="select w-auto cursor-pointer text-sm"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">All departments</option>
                {(departments || []).map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
            <Stat label="Employees" value={boardStats.total} tone="brand" />
            <Stat label="Present" value={boardStats.present} tone="ok" />
            <Stat label="Late" value={boardStats.late} tone="warn" />
            <Stat label="Absent" value={boardStats.absent} tone="danger" />
            <Stat label="On leave" value={boardStats.on_leave} tone="sky" />
            <Stat label="Not marked" value={boardStats.unmarked} tone="neutral" />
          </div>

          {loadingBoard ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : boardRows.length === 0 ? (
            <EmptyState title="No employees match" hint="Try another date or clear filters." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {boardRows.map((row) => {
                const meta = statusMeta(row.status);
                return (
                  <button
                    key={row.employee.id}
                    type="button"
                    onClick={() => {
                      setMode('employee');
                      setSelectedEmployeeId(row.employee.id);
                      setSelectedDate(boardDate);
                      setMonthDate(startOfMonth(parseISO(boardDate)));
                      setSearchParams({
                        mode: 'employee',
                        employee: row.employee.id,
                        date: boardDate,
                      });
                    }}
                    className="card-surface card-surface-hover cursor-pointer p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                          {(row.employee.name || '?').slice(0, 1)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{row.employee.name}</p>
                          <p className="text-xs text-slate-500">{row.employee.employeeId}</p>
                        </div>
                      </div>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.color}`} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {row.status ? <Badge value={row.status} /> : null}
                      {row.attendance?.source ? (
                        <span className="text-xs capitalize text-slate-500">
                          {String(row.attendance.source).replaceAll('_', ' ')}
                        </span>
                      ) : null}
                    </div>
                    {row.attendance?.workLog?.title ? (
                      <p className="mt-2 truncate text-sm text-slate-600">
                        {row.attendance.workLog.title}
                      </p>
                    ) : row.status === 'unmarked' ? (
                      <p className="mt-2 text-sm text-slate-500">No attendance marked</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
