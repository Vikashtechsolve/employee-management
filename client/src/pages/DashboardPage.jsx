import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { format, parseISO, subDays } from 'date-fns';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, PageHeader, StatCard } from '../components/ui';
import { useAuthStore } from '../store/authStore';
import EmployeeDashboard from './EmployeeDashboard';

function CompletionRing({ value }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative mx-auto h-36 w-36">
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
        <p className="font-display text-3xl text-stone-900">{value}%</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          Submitted
        </p>
      </div>
    </div>
  );
}

function AdminWorkDashboard({ data }) {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date') || data.today;
  const [tab, setTab] = useState('all'); // all | submitted | missing | unreviewed
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [note, setNote] = useState('');

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

  const reviewMutation = useMutation({
    mutationFn: async ({ id, payload }) => api.patch(`/worklogs/${id}/review`, payload),
    onSuccess: () => {
      toast.success('Work updated');
      qc.invalidateQueries({ queryKey: ['admin-work-board'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['work-board'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  function shiftDate(delta) {
    const next = format(subDays(parseISO(date), -delta), 'yyyy-MM-dd');
    setSearchParams({ date: next });
    setSelectedId(null);
  }

  const chartData = (data.weeklyTrend || []).map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'EEE'),
  }));

  return (
    <div>
      <PageHeader
        title="Daily work management"
        subtitle={`Track, review, and manage employee task submissions · ${date}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-secondary px-2" onClick={() => shiftDate(-1)}>
              <ChevronLeft size={16} />
            </button>
            <input
              className="input w-auto"
              type="date"
              value={date}
              onChange={(e) => {
                setSearchParams({ date: e.target.value });
                setSelectedId(null);
              }}
            />
            <button type="button" className="btn btn-secondary px-2" onClick={() => shiftDate(1)}>
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchParams({ date: data.today });
                setSelectedId(null);
              }}
            >
              Today
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_1fr_1fr]">
        <div className="card-surface flex flex-col items-center justify-center p-4">
          <CompletionRing value={summary?.completionRate ?? data.workCompletionRate ?? 0} />
          <p className="mt-2 text-center text-sm text-stone-500">
            {summary?.submitted ?? data.submissionsToday}/{summary?.total ?? data.activeEmployees}{' '}
            employees submitted
          </p>
        </div>
        <StatCard
          label="Missing today"
          value={summary?.missing ?? data.missingToday ?? 0}
          hint="No daily work yet"
        />
        <StatCard
          label="Awaiting review"
          value={summary?.unreviewed ?? data.unreviewedToday ?? 0}
          hint="Submitted but not reviewed"
        />
        <StatCard
          label="Late attendance"
          value={summary?.late ?? data.attendanceToday?.late ?? 0}
          hint={`Present ${summary?.present ?? data.attendanceToday?.present ?? 0}`}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <div className="card-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-xl">7-day submission trend</h3>
            {isFetching ? <span className="text-xs text-stone-400">Refreshing…</span> : null}
          </div>
          <div className="h-52">
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
                  formatter={(value, name) => [value, name === 'submitted' ? 'Submitted' : name]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''}
                />
                <Bar dataKey="submitted" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="font-display text-xl">By department</h3>
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

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="card-surface overflow-hidden">
          <div className="border-b border-[var(--line)] p-4">
            <div className="flex flex-wrap items-center gap-2">
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
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    tab === t.id ? 'bg-teal-900 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative mt-3">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                className="input pl-9"
                placeholder="Search employee or work title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="max-h-[520px] overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No matching employees" hint="Try another filter or date." />
              </div>
            ) : (
              <table className="data">
                <thead className="sticky top-0 bg-[var(--bg-elevated)]">
                  <tr>
                    <th>Employee</th>
                    <th>Work</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const active = selected?.employee.id === row.employee.id;
                    return (
                      <tr
                        key={row.employee.id}
                        onClick={() => {
                          setSelectedId(row.employee.id);
                          setNote(row.workLog?.adminNote || '');
                        }}
                        className={`cursor-pointer ${active ? 'bg-teal-50' : 'hover:bg-stone-50'}`}
                      >
                        <td>
                          <p className="font-semibold">{row.employee.name}</p>
                          <p className="text-xs text-stone-500">
                            {row.employee.employeeId}
                            {row.employee.department?.name
                              ? ` · ${row.employee.department.name}`
                              : ''}
                          </p>
                        </td>
                        <td className="max-w-[180px]">
                          {row.submitted ? (
                            <div>
                              <p className="truncate text-sm">{row.workLog?.title}</p>
                              <p className="text-xs text-stone-500">
                                {row.workLog?.hoursWorked}h ·{' '}
                                {row.workLog?.attachments?.length || 0} files
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-amber-700">Not submitted</span>
                          )}
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            {row.attendance?.status ? (
                              <Badge value={row.attendance.status} />
                            ) : (
                              <span className="badge bg-stone-100 text-stone-600">no att.</span>
                            )}
                            {row.workLog?.reviewedAt ? (
                              <span className="text-[10px] font-semibold uppercase text-emerald-700">
                                Reviewed
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card-surface min-h-[520px] overflow-hidden">
          {!selected ? (
            <div className="flex h-full items-center justify-center p-8 text-stone-500">
              Select an employee to manage their daily work
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <header className="border-b border-[var(--line)] bg-gradient-to-br from-teal-950 via-teal-900 to-stone-900 px-5 py-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-teal-200/80">{date}</p>
                    <h3 className="font-display mt-1 text-2xl">{selected.employee.name}</h3>
                    <p className="text-sm text-teal-100/80">
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
                  <p className="font-display text-2xl">No daily task submitted</p>
                  <p className="max-w-sm text-sm text-stone-500">
                    Follow up with this employee. Attendance may remain unmarked until they submit
                    work with proof.
                  </p>
                  <Link
                    to={`/app/team/worklogs?date=${date}&employee=${selected.employee.id}`}
                    className="btn btn-secondary"
                  >
                    Open full board
                  </Link>
                </div>
              ) : (
                <div className="flex-1 space-y-4 overflow-auto p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Task title
                    </p>
                    <p className="font-display mt-1 text-xl">{selected.workLog.title}</p>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-stone-600">
                    <span className="inline-flex items-center gap-1">
                      <ClipboardCheck size={14} /> {selected.workLog.hoursWorked}h
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Paperclip size={14} /> {selected.workLog.attachments?.length || 0} proof
                      files
                    </span>
                    {selected.workLog.submittedAt ? (
                      <span>
                        {format(new Date(selected.workLog.submittedAt), 'dd MMM, HH:mm')}
                      </span>
                    ) : null}
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

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Work description
                    </p>
                    <div className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-700">
                      {selected.workLog.description}
                    </div>
                  </div>

                  {(selected.workLog.attachments || []).length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Attachments
                      </p>
                      <ul className="mt-2 space-y-1 text-sm">
                        {selected.workLog.attachments.map((a) => (
                          <li
                            key={a.key}
                            className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2"
                          >
                            <span className="truncate">{a.originalName}</span>
                            <span className="text-xs text-stone-500">
                              {Math.max(1, Math.round(a.size / 1024))} KB
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <label className="block text-sm font-medium">
                    Admin note
                    <textarea
                      className="textarea mt-1"
                      placeholder="Add review notes for this submission…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={reviewMutation.isPending}
                      onClick={() =>
                        reviewMutation.mutate({
                          id: selected.workLog._id,
                          payload: { reviewed: true, adminNote: note, locked: true },
                        })
                      }
                    >
                      <CheckCircle2 size={16} /> Mark reviewed & lock
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
                      <Eye size={16} /> Full detail
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open tickets" value={data.openTickets} />
        <StatCard label="Overdue tickets" value={data.overdueTickets} />
        <StatCard label="Pending leaves" value={data.pendingLeaves} />
        <StatCard label="Present rate" value={`${data.presentRate}%`} />
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
    return <p className="text-stone-500">Loading dashboard…</p>;
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
