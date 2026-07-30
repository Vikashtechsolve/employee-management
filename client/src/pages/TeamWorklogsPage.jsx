import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format, parseISO, addDays, subDays } from 'date-fns';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, PageHeader } from '../components/ui';
import { useAuthStore } from '../store/authStore';

function isImage(mime) {
  return String(mime || '').startsWith('image/');
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

function AttachmentThumb({ file }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);

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

  if (loading) {
    return (
      <div className="flex h-28 items-center justify-center rounded-xl bg-stone-100 text-xs text-stone-400">
        Loading…
      </div>
    );
  }

  if (url && isImage(file.mimeType)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="group block overflow-hidden rounded-xl border border-[var(--line)]"
      >
        <img
          src={url}
          alt={file.originalName}
          className="h-28 w-full object-cover transition group-hover:scale-[1.02]"
        />
      </a>
    );
  }

  return (
    <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--line)] bg-stone-50 px-2 text-center">
      {isImage(file.mimeType) ? (
        <ImageIcon size={18} className="text-stone-400" />
      ) : (
        <FileText size={18} className="text-stone-400" />
      )}
      <p className="line-clamp-2 text-[11px] text-stone-500">{file.originalName}</p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-teal-800">
          Open
        </a>
      ) : (
        <span className="text-[10px] text-amber-700">Configure R2 to preview</span>
      )}
    </div>
  );
}

export default function TeamWorklogsPage() {
  const isAdminLike = useAuthStore((s) => s.isAdminLike());
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [date, setDate] = useState(
    searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  );
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState(searchParams.get('employee'));
  const [adminNote, setAdminNote] = useState('');

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data.data,
    enabled: isAdminLike,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['work-board', date, search, department, status],
    queryFn: async () =>
      (
        await api.get('/worklogs/board', {
          params: {
            date,
            search: search || undefined,
            department: department || undefined,
            status: status || undefined,
          },
        })
      ).data.data,
  });

  const rows = data?.rows || [];
  const summary = data?.summary;

  useEffect(() => {
    if (!rows.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((r) => r.employee.id === selectedId)) {
      const fromUrl = searchParams.get('employee');
      const match = fromUrl && rows.find((r) => r.employee.id === fromUrl);
      const firstSubmitted = rows.find((r) => r.submitted);
      setSelectedId((match || firstSubmitted || rows[0]).employee.id);
    }
  }, [rows, selectedId, searchParams]);

  const selected = useMemo(
    () => rows.find((r) => r.employee.id === selectedId) || null,
    [rows, selectedId]
  );

  useEffect(() => {
    setAdminNote(selected?.workLog?.adminNote || '');
  }, [selected?.workLog?._id, selected?.workLog?.adminNote]);

  const reviewMutation = useMutation({
    mutationFn: (payload) => api.patch(`/worklogs/${selected.workLog._id}/review`, payload),
    onSuccess: () => {
      toast.success('Work updated');
      qc.invalidateQueries({ queryKey: ['work-board'] });
      qc.invalidateQueries({ queryKey: ['admin-work-board'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  function changeDate(next) {
    setDate(next);
    const params = { date: next };
    if (selectedId) params.employee = selectedId;
    setSearchParams(params);
  }

  function shiftDate(delta) {
    const base = parseISO(date);
    changeDate(format(delta < 0 ? subDays(base, 1) : addDays(base, 1), 'yyyy-MM-dd'));
  }

  function selectEmployee(id) {
    setSelectedId(id);
    setSearchParams({ date, employee: id });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={isAdminLike ? 'Employee Work' : 'Team Work'}
        subtitle="Review daily submissions, proof files, and mark attendance-linked work"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-secondary px-2" onClick={() => shiftDate(-1)}>
              <ChevronLeft size={16} />
            </button>
            <input
              className="input w-auto"
              type="date"
              value={date}
              onChange={(e) => changeDate(e.target.value)}
            />
            <button type="button" className="btn btn-secondary px-2" onClick={() => shiftDate(1)}>
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => changeDate(format(new Date(), 'yyyy-MM-dd'))}
            >
              Today
            </button>
          </div>
        }
      />

      <section className="overflow-hidden rounded-[28px] border border-teal-200 bg-[linear-gradient(135deg,#f0fdfa_0%,#fffcf7_55%,#fff7ed_100%)] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800">
              Work board · {format(parseISO(date), 'EEEE, dd MMM yyyy')}
            </p>
            <h2 className="font-display mt-2 text-3xl text-stone-900">
              {summary?.completionRate ?? 0}% submission complete
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {summary?.submitted ?? 0} submitted · {summary?.missing ?? 0} missing ·{' '}
              {summary?.unreviewed ?? 0} awaiting review
              {isFetching ? ' · refreshing…' : ''}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricPill label="Employees" value={summary?.total ?? '—'} tone="brand" />
          <MetricPill label="Submitted" value={summary?.submitted ?? '—'} tone="ok" />
          <MetricPill label="Missing" value={summary?.missing ?? '—'} tone="warn" />
          <MetricPill label="Unreviewed" value={summary?.unreviewed ?? '—'} tone="danger" />
        </div>
      </section>

      <div className="card-surface flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            className="input pl-9"
            placeholder="Search employee, ID, or work title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdminLike ? (
          <select
            className="select w-auto min-w-[160px]"
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
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--line)] bg-white p-1">
          {[
            { value: '', label: 'All' },
            { value: 'submitted', label: 'Submitted' },
            { value: 'missing', label: 'Missing' },
            { value: 'unreviewed', label: 'Unreviewed' },
          ].map((opt) => (
            <button
              key={opt.value || 'all'}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                status === opt.value
                  ? 'bg-teal-800 text-white'
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-stone-500">Loading employee work…</p>
      ) : !rows.length ? (
        <EmptyState
          title="No employees match filters"
          hint="Try another date, department, or clear search."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="card-surface max-h-[74vh] overflow-hidden">
            <div className="border-b border-[var(--line)] px-4 py-3">
              <p className="font-display text-lg">Employees</p>
              <p className="text-xs text-stone-500">{rows.length} in this view</p>
            </div>
            <ul className="max-h-[66vh] space-y-1 overflow-auto p-2">
              {rows.map((row) => {
                const active = row.employee.id === selectedId;
                return (
                  <li key={row.employee.id}>
                    <button
                      type="button"
                      onClick={() => selectEmployee(row.employee.id)}
                      className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                        active ? 'bg-teal-900 text-white shadow-sm' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          active ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-900'
                        }`}
                      >
                        {(row.employee.name || '?').slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`truncate text-sm font-semibold ${
                              active ? 'text-white' : 'text-stone-900'
                            }`}
                          >
                            {row.employee.name}
                          </p>
                          {row.submitted ? (
                            <CheckCircle2
                              size={15}
                              className={active ? 'text-emerald-300' : 'text-emerald-600'}
                            />
                          ) : (
                            <AlertCircle
                              size={15}
                              className={active ? 'text-amber-200' : 'text-amber-600'}
                            />
                          )}
                        </div>
                        <p
                          className={`truncate text-xs ${
                            active ? 'text-teal-100/80' : 'text-stone-500'
                          }`}
                        >
                          {row.employee.employeeId}
                          {row.employee.department?.name
                            ? ` · ${row.employee.department.name}`
                            : ''}
                        </p>
                        <p
                          className={`mt-1 truncate text-xs ${
                            active ? 'text-teal-50/90' : 'text-stone-600'
                          }`}
                        >
                          {row.submitted
                            ? row.workLog?.title || 'Submitted'
                            : 'No work submitted'}
                          {row.workLog?.reviewedAt ? ' · Reviewed' : ''}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <section className="card-surface min-h-[74vh] overflow-hidden">
            {!selected ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-stone-500">
                Select an employee
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <header className="border-b border-[var(--line)] bg-[linear-gradient(135deg,#042f2e_0%,#134e4a_50%,#1c1917_100%)] px-5 py-5 text-white">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-teal-200/80">
                        {date} · {selected.employee.employeeId}
                      </p>
                      <h2 className="font-display mt-1 text-3xl">{selected.employee.name}</h2>
                      <p className="mt-1 text-sm text-teal-100/80">
                        {selected.employee.designation || 'Employee'}
                        {selected.employee.department?.name
                          ? ` · ${selected.employee.department.name}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selected.attendance?.status ? (
                        <Badge value={selected.attendance.status} />
                      ) : (
                        <span className="badge bg-white/15 text-white">No attendance</span>
                      )}
                      <Badge value={selected.submitted ? 'submitted' : 'pending'} />
                      {selected.workLog?.reviewedAt ? (
                        <span className="badge bg-emerald-100 text-emerald-800">Reviewed</span>
                      ) : null}
                      {selected.workLog?.locked ? (
                        <span className="badge bg-amber-100 text-amber-900">
                          <Lock size={11} className="mr-1 inline" /> Locked
                        </span>
                      ) : null}
                    </div>
                  </div>
                </header>

                {!selected.workLog ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
                    <UserRound size={36} className="text-stone-300" />
                    <p className="font-display text-2xl text-stone-800">No daily work yet</p>
                    <p className="max-w-md text-stone-500">
                      This employee has not submitted work for {date}. Follow up so attendance can
                      be marked.
                    </p>
                  </div>
                ) : (
                  <div className="grid flex-1 gap-0 xl:grid-cols-[1.35fr_1fr]">
                    <div className="space-y-5 border-b border-[var(--line)] p-5 xl:border-b-0 xl:border-r">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                          Work title
                        </p>
                        <h3 className="font-display mt-1 text-2xl text-stone-900">
                          {selected.workLog.title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-stone-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock size={14} /> {selected.workLog.hoursWorked} hours
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Paperclip size={14} /> {selected.workLog.attachments?.length || 0} files
                        </span>
                        {selected.workLog.submittedAt ? (
                          <span>
                            Submitted{' '}
                            {format(new Date(selected.workLog.submittedAt), 'dd MMM yyyy, HH:mm')}
                          </span>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                          Description
                        </p>
                        <div className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-700">
                          {selected.workLog.description}
                        </div>
                      </div>

                      {selected.attendance?.remarks ? (
                        <p className="text-sm text-stone-500">
                          Attendance note: {selected.attendance.remarks}
                        </p>
                      ) : null}

                      <div className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
                        <p className="text-sm font-semibold text-stone-900">Admin review</p>
                        <textarea
                          className="textarea bg-white"
                          placeholder="Add a review note for this submission…"
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-cta"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                reviewed: true,
                                adminNote,
                                locked: true,
                              })
                            }
                          >
                            <span className="btn-cta-icon">
                              <Lock size={15} />
                            </span>
                            <span className="text-left">
                              <span className="block">Mark reviewed & lock</span>
                              <span className="btn-cta-sub">Employee cannot edit further</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={reviewMutation.isPending}
                            onClick={() =>
                              reviewMutation.mutate({
                                reviewed: true,
                                adminNote,
                              })
                            }
                          >
                            <CheckCircle2 size={15} /> Mark reviewed
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Proof / screenshots
                      </p>
                      {(selected.workLog.attachments || []).length === 0 ? (
                        <p className="mt-4 text-sm text-stone-500">No files attached.</p>
                      ) : (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {selected.workLog.attachments.map((file) => (
                            <div key={file.key}>
                              <AttachmentThumb file={file} />
                              <p className="mt-1 truncate text-[11px] text-stone-500">
                                {file.originalName} ·{' '}
                                {Math.max(1, Math.round(file.size / 1024))} KB
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
