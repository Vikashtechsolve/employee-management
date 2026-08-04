import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
  getDay,
} from 'date-fns';
import {
  Search,
  Paperclip,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  UserRound,
  ChevronLeft,
  ChevronRight,
  Lock,
  Users,
  CalendarDays,
  LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, PageHeader } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const WORK_ROLES = new Set(['employee', 'manager', 'hr']);

function isImage(mime) {
  return String(mime || '').startsWith('image/');
}

function Stat({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-slate-50 text-slate-800 ring-slate-200',
    ok: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    warn: 'bg-amber-50 text-amber-900 ring-amber-100',
    danger: 'bg-rose-50 text-rose-800 ring-rose-100',
    brand: 'bg-teal-50 text-teal-800 ring-teal-100',
  };
  return (
    <div className={`rounded-xl px-3 py-2.5 ring-1 ${tones[tone]}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentCard({ file }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const isImg = isImage(file.mimeType);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (file.url && !file.url.startsWith('local-dev://')) {
        setUrl(file.url);
        return;
      }
      setLoading(true);
      try {
        const { data } = await api.get('/files/signed-url', { params: { key: file.key } });
        if (!cancelled && data.data?.url) setUrl(data.data.url);
      } catch {
        if (!cancelled) setUrl(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [file.key, file.url]);

  const thumb = loading ? (
    <div className="h-full w-full animate-pulse bg-slate-200" />
  ) : url && isImg ? (
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : isImg ? (
    <ImageIcon size={18} className="text-teal-600" />
  ) : (
    <FileText size={18} className="text-teal-600" />
  );

  const meta = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80">
        {thumb}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{file.originalName}</p>
        <p className="text-xs text-slate-500">
          {formatFileSize(file.size) || (isImg ? 'Image' : 'Document')}
        </p>
      </div>
      {url ? (
        <span className="shrink-0 text-xs font-semibold text-teal-700 group-hover:text-teal-800">
          Open
        </span>
      ) : !loading ? (
        <span className="shrink-0 text-xs text-amber-600">Unavailable</span>
      ) : null}
    </>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-teal-300 hover:bg-teal-50/40"
      >
        {meta}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
      {meta}
    </div>
  );
}

function MonthCalendar({ monthDate, selectedDate, onMonthChange, onSelectDate, dayMap, today }) {
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
    if (d.submitted) {
      return 'cursor-pointer bg-emerald-100 text-emerald-900 hover:bg-emerald-200 ring-1 ring-emerald-200';
    }
    if (d.attendance === 'on_leave' || d.attendance === 'holiday' || d.attendance === 'weekend') {
      return 'cursor-pointer bg-sky-50 text-sky-700 hover:bg-sky-100 ring-1 ring-sky-100';
    }
    if (d.weekday) {
      return 'cursor-pointer bg-rose-50 text-rose-800 hover:bg-rose-100 ring-1 ring-rose-100';
    }
    return 'cursor-pointer bg-slate-50 text-slate-500 hover:bg-slate-100';
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
          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && onSelectDate(key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium transition ${dayClass(key, inMonth)}`}
            >
              {inMonth ? format(cell, 'd') : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-emerald-200 ring-1 ring-emerald-300" /> Submitted
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-rose-100 ring-1 ring-rose-200" /> Missing
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-sky-100 ring-1 ring-sky-200" /> Leave / off
        </span>
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

function WorkDetailPanel({ workLog, attendance, employee, date, adminNote, setAdminNote, onReview, reviewing }) {
  if (!employee) {
    return (
      <div className="card-surface flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
        <Users size={36} className="text-slate-300" />
        <p className="mt-3 text-lg font-semibold text-slate-800">Select an employee</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Choose someone from the list to view their monthly work history and review submissions.
        </p>
      </div>
    );
  }

  if (!workLog) {
    return (
      <div className="card-surface flex min-h-[420px] flex-col">
        <div className="detail-header">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
            {format(parseISO(date), 'dd MMM yyyy')}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{employee.name}</h2>
          <p className="text-sm text-slate-600">
            {employee.employeeId}
            {employee.department?.name ? ` · ${employee.department.name}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {attendance?.status ? <Badge value={attendance.status} /> : null}
            <Badge value="pending" />
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <AlertCircle size={32} className="text-amber-500" />
          <p className="text-lg font-semibold text-slate-800">No work submitted</p>
          <p className="max-w-md text-sm text-slate-500">
            Nothing was submitted on this date. Pick another day on the calendar or check the month
            list below.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface overflow-hidden shadow-[var(--shadow-md)]">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/40 px-5 py-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-lg font-semibold text-white shadow-sm">
            {(employee.name || '?').slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-teal-700">
              {format(parseISO(date), 'EEEE, dd MMM yyyy')}
            </p>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900">{workLog.title}</h2>
            <p className="text-sm text-slate-600">
              {employee.name} · {employee.employeeId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {attendance?.status ? <Badge value={attendance.status} /> : null}
            <Badge value="submitted" />
            {workLog.reviewedAt ? (
              <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                Reviewed
              </span>
            ) : null}
            {workLog.locked ? (
              <span className="badge bg-amber-50 text-amber-800 ring-1 ring-amber-100">
                <Lock size={11} className="mr-1 inline" /> Locked
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
            <Clock size={14} className="text-teal-600" />
            {workLog.hoursWorked} hours
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
            <Paperclip size={14} className="text-teal-600" />
            {workLog.attachments?.length || 0} proof files
          </span>
          {workLog.submittedAt ? (
            <span className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
              Submitted {format(new Date(workLog.submittedAt), 'dd MMM yyyy · HH:mm')}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* Description */}
        <section>
          <h3 className="text-sm font-semibold text-slate-900">Work description</h3>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
            {workLog.description}
          </div>
        </section>

        {/* Proof files */}
        {(workLog.attachments || []).length > 0 ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Proof files</h3>
              <span className="text-xs text-slate-500">
                {workLog.attachments.length} attachment{workLog.attachments.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="space-y-2">
              {workLog.attachments.map((file) => (
                <AttachmentCard key={file.key} file={file} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Admin review */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-900">Admin review</h3>
          </div>
          <textarea
            className="textarea mt-3 min-h-[88px] text-sm"
            placeholder="Add feedback or review notes for this submission…"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary cursor-pointer"
              disabled={reviewing}
              onClick={() => onReview({ reviewed: true, adminNote, locked: true })}
            >
              <Lock size={15} /> Review & lock
            </button>
            <button
              type="button"
              className="btn btn-secondary cursor-pointer"
              disabled={reviewing}
              onClick={() => onReview({ reviewed: true, adminNote })}
            >
              <CheckCircle2 size={15} /> Mark reviewed
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function TeamWorklogsPage() {
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
  const [adminNote, setAdminNote] = useState('');

  // Daily board mode state
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
    queryKey: ['work-review-employees', isAdminLike],
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

  const { data: monthLogs = [], isFetching: fetchingLogs } = useQuery({
    queryKey: ['employee-month-logs', selectedEmployeeId, monthFrom, monthTo],
    queryFn: async () =>
      selectedEmployeeId
        ? (
            await api.get('/worklogs/all', {
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

  const { data: monthAttendance = [] } = useQuery({
    queryKey: ['employee-month-attendance', selectedEmployeeId, monthFrom, monthTo],
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
    const logsByDate = Object.fromEntries(monthLogs.map((w) => [w.date, w]));
    const attByDate = Object.fromEntries(monthAttendance.map((a) => [a.date, a]));

    for (const d of eachDayOfInterval({ start: parseISO(monthFrom), end: parseISO(monthTo) })) {
      const key = format(d, 'yyyy-MM-dd');
      const wd = getDay(d);
      const isWeekend = wd === 0 || wd === 6;
      const att = attByDate[key];
      const log = logsByDate[key];
      map[key] = {
        submitted: Boolean(log && log.status === 'submitted'),
        attendance: att?.status || (isWeekend ? 'weekend' : null),
        isFuture: key > today,
        weekday: !isWeekend,
        workLog: log || null,
        attendanceRow: att || null,
      };
    }
    return map;
  }, [monthLogs, monthAttendance, monthFrom, monthTo, today]);

  const monthStats = useMemo(() => {
    const days = Object.values(dayMap).filter((d) => !d.isFuture && d.weekday);
    const submitted = days.filter((d) => d.submitted).length;
    const missing = days.filter(
      (d) => !d.submitted && !['on_leave', 'holiday', 'weekend'].includes(d.attendance)
    ).length;
    const unreviewed = monthLogs.filter((w) => w.status === 'submitted' && !w.reviewedAt).length;
    return { submitted, missing, total: days.length, unreviewed };
  }, [dayMap, monthLogs]);

  const selectedDay = dayMap[selectedDate];
  const selectedWorkLog = selectedDay?.workLog || null;
  const selectedAttendance = selectedDay?.attendanceRow || null;

  useEffect(() => {
    setAdminNote(selectedWorkLog?.adminNote || '');
  }, [selectedWorkLog?._id, selectedWorkLog?.adminNote]);

  useEffect(() => {
    if (!selectedEmployeeId && filteredEmployees.length) {
      const fromUrl = searchParams.get('employee');
      const match = fromUrl && filteredEmployees.find((e) => e.id === fromUrl);
      if (match) setSelectedEmployeeId(match.id);
    }
  }, [filteredEmployees, selectedEmployeeId, searchParams]);

  const reviewMutation = useMutation({
    mutationFn: (payload) => api.patch(`/worklogs/${selectedWorkLog._id}/review`, payload),
    onSuccess: () => {
      toast.success('Work updated');
      qc.invalidateQueries({ queryKey: ['employee-month-logs'] });
      qc.invalidateQueries({ queryKey: ['work-board'] });
      qc.invalidateQueries({ queryKey: ['admin-work-board'] });
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

  // Daily board queries
  const { data: boardData, isLoading: loadingBoard } = useQuery({
    queryKey: ['work-board', boardDate, boardSearch, department, boardStatus],
    queryFn: async () =>
      (
        await api.get('/worklogs/board', {
          params: {
            date: boardDate,
            search: boardSearch || undefined,
            department: department || undefined,
            status: boardStatus || undefined,
          },
        })
      ).data.data,
    enabled: mode === 'daily',
  });

  const boardRows = boardData?.rows || [];

  return (
    <div className="space-y-5">
      <PageHeader
        title={isAdminLike ? 'Employee Work' : 'Team Work'}
        subtitle="Review submissions by employee or browse the daily team board"
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
          {/* Employee roster */}
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
                          active
                            ? 'bg-teal-50 ring-1 ring-teal-200'
                            : 'hover:bg-slate-50'
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

          {/* Main: calendar + detail */}
          <div className="space-y-4">
            {!selectedEmployee ? (
              <EmptyState
                title="Pick an employee"
                hint="Select someone from the list to see their full month of work submissions."
              />
            ) : (
              <>
                <div className="hero-panel p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
                        {format(monthDate, 'MMMM yyyy')}
                        {fetchingLogs ? ' · updating…' : ''}
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
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <Stat label="Submitted" value={monthStats.submitted} tone="ok" />
                      <Stat label="Missing" value={monthStats.missing} tone="danger" />
                      <Stat label="Unreviewed" value={monthStats.unreviewed} tone="warn" />
                      <Stat label="Work days" value={monthStats.total} tone="brand" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
                  <MonthCalendar
                    monthDate={monthDate}
                    selectedDate={selectedDate}
                    onMonthChange={setMonthDate}
                    onSelectDate={selectDate}
                    dayMap={dayMap}
                    today={today}
                  />

                  <div className="space-y-4">
                    <WorkDetailPanel
                      workLog={selectedWorkLog}
                      attendance={selectedAttendance}
                      employee={selectedEmployee}
                      date={selectedDate}
                      adminNote={adminNote}
                      setAdminNote={setAdminNote}
                      reviewing={reviewMutation.isPending}
                      onReview={(payload) => reviewMutation.mutate(payload)}
                    />

                    {/* Month timeline */}
                    <div className="card-surface overflow-hidden">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">This month</p>
                        <p className="text-xs text-slate-500">All submissions — click to open</p>
                      </div>
                      <ul className="max-h-64 divide-y divide-slate-100 overflow-auto">
                        {monthLogs.length === 0 ? (
                          <li className="p-4 text-sm text-slate-500">No submissions this month</li>
                        ) : (
                          monthLogs.map((log) => (
                            <li key={log._id}>
                              <button
                                type="button"
                                onClick={() => selectDate(log.date)}
                                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                                  log.date === selectedDate ? 'bg-teal-50' : ''
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900">
                                    {format(parseISO(log.date), 'dd MMM yyyy')}
                                  </p>
                                  <p className="truncate text-sm text-slate-600">{log.title}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <span className="text-xs text-slate-500">
                                    {log.attachments?.length || 0} files
                                  </span>
                                  {log.reviewedAt ? (
                                    <CheckCircle2 size={16} className="text-emerald-600" />
                                  ) : (
                                    <AlertCircle size={16} className="text-amber-500" />
                                  )}
                                </div>
                              </button>
                            </li>
                          ))
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
        /* Daily board mode */
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
                placeholder="Search…"
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
              />
            </div>
            <select
              className="select w-auto cursor-pointer text-sm"
              value={boardStatus}
              onChange={(e) => setBoardStatus(e.target.value)}
            >
              <option value="">All</option>
              <option value="submitted">Submitted</option>
              <option value="missing">Missing</option>
              <option value="unreviewed">Unreviewed</option>
            </select>
          </div>

          {loadingBoard ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : boardRows.length === 0 ? (
            <EmptyState title="No data for this date" hint="Try another date or clear filters." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {boardRows.map((row) => (
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
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{row.employee.name}</p>
                      <p className="text-xs text-slate-500">{row.employee.employeeId}</p>
                    </div>
                    {row.submitted ? (
                      <CheckCircle2 size={18} className="text-emerald-600" />
                    ) : (
                      <AlertCircle size={18} className="text-amber-500" />
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm text-slate-600">
                    {row.submitted ? row.workLog?.title : 'Not submitted'}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {row.attendance?.status ? <Badge value={row.attendance.status} /> : null}
                    <Badge value={row.submitted ? 'submitted' : 'pending'} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
