import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  Upload,
  FileText,
  Image as ImageIcon,
  Clock3,
  CheckCircle2,
  Paperclip,
  Pencil,
  Eye,
  Trash2,
  CalendarDays,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, FormField, PageHeader, StatPill } from '../components/ui';

const MAX_PROOF_FILES = 10;

function fileLabel(file) {
  return file.originalName || file.name || 'file';
}

function fileIdentity(file) {
  if (file.key) return file.key;
  return `${file.name}-${file.size}-${file.lastModified ?? 0}`;
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime) {
  return String(mime || '').startsWith('image/');
}

function ProofFileRow({ file, onRemove, removing }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const img = isImage(file.mimeType || file.type);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (file.url && !String(file.url).startsWith('local-dev://')) {
        setUrl(file.url);
        return;
      }
      if (!file.key) return;
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
  ) : url && img ? (
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : img ? (
    <ImageIcon size={18} className="text-teal-600" />
  ) : (
    <FileText size={18} className="text-teal-600" />
  );

  const content = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200/80">
        {thumb}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{fileLabel(file)}</p>
        <p className="text-xs text-slate-500">
          {formatFileSize(file.size) || (img ? 'Image' : 'Document')}
        </p>
      </div>
      {url ? (
        <span className="shrink-0 text-xs font-semibold text-teal-700">Open</span>
      ) : !loading ? (
        <span className="shrink-0 text-xs text-slate-400">Saved</span>
      ) : null}
    </>
  );

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
      {url && !onRemove ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 transition hover:opacity-90"
        >
          {content}
        </a>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
      )}
      {onRemove ? (
        <button
          type="button"
          className="shrink-0 rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
          disabled={removing}
          onClick={() => onRemove(file.key)}
          title="Remove file"
        >
          <Trash2 size={15} />
        </button>
      ) : null}
    </div>
  );
}

function PendingFileRow({ file, onRemove }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file.type?.startsWith('image/')) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-teal-200 bg-teal-50/30 px-3 py-2">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-teal-100">
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileText size={18} className="text-teal-600" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
        <p className="text-xs text-slate-500">{formatFileSize(file.size)} · ready to upload</p>
      </div>
      <button
        type="button"
        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
        onClick={onRemove}
        title="Remove"
      >
        <X size={15} />
      </button>
    </div>
  );
}

function WorkMonthCalendar({ monthDate, selectedDate, onMonthChange, onSelectDate, dayMap, today }) {
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
      return 'cursor-pointer bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-200';
    }
    if (d.attendance === 'on_leave' || d.attendance === 'holiday' || d.attendance === 'weekend') {
      return 'cursor-pointer bg-sky-50 text-sky-700 ring-1 ring-sky-100 hover:bg-sky-100';
    }
    if (d.weekday) {
      return 'cursor-pointer bg-rose-50 text-rose-800 ring-1 ring-rose-100 hover:bg-rose-100';
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
          const d = dayMap[key];
          return (
            <button
              key={key}
              type="button"
              disabled={!inMonth}
              onClick={() => inMonth && onSelectDate(key)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium transition ${dayClass(key, inMonth)}`}
              title={d?.workLog?.title || undefined}
            >
              {inMonth ? (
                <>
                  <span>{format(cell, 'd')}</span>
                  {d?.submitted && key !== selectedDate ? (
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  ) : null}
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-emerald-200 ring-1 ring-emerald-300" /> Submitted
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-rose-100 ring-1 ring-rose-200" /> Missing
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-sky-100 ring-1 ring-sky-200" /> Off / leave
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

function WorkDetailPanel({ work, attendance, date, emptyHint }) {
  if (!work) {
    return (
      <div className="card-surface flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
        <AlertCircle size={32} className="text-amber-500" />
        <p className="mt-3 text-lg font-semibold text-slate-800">No work submitted</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="card-surface overflow-hidden shadow-[var(--shadow-md)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/40 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
              {format(parseISO(date), 'EEEE, dd MMM yyyy')}
              {work.submittedAt
                ? ` · ${format(new Date(work.submittedAt), 'HH:mm')}`
                : ''}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{work.title}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge value={work.status} />
            {attendance?.status ? <Badge value={attendance.status} /> : null}
            {work.locked ? (
              <span className="badge bg-amber-50 text-amber-800 ring-1 ring-amber-100">
                <Lock size={11} className="mr-1 inline" /> Locked
              </span>
            ) : null}
            {work.reviewedAt ? (
              <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                Reviewed
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
            <Clock3 size={14} className="text-teal-600" />
            {work.hoursWorked || 0} hours
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200">
            <Paperclip size={14} className="text-teal-600" />
            {work.attachments?.length || 0} proof files
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <section>
          <h3 className="text-sm font-semibold text-slate-900">Work description</h3>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
            {work.description}
          </div>
        </section>

        {(work.attachments || []).length > 0 ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Proof files</h3>
              <span className="text-xs text-slate-500">
                {work.attachments.length} attachment{work.attachments.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="space-y-2">
              {work.attachments.map((file) => (
                <ProofFileRow key={file.key || fileIdentity(file)} file={file} />
              ))}
            </div>
          </section>
        ) : null}

        {work.adminNote ? (
          <section className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Admin note</p>
            <p className="mt-1 text-sm text-slate-700">{work.adminNote}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ProofUploadZone({ existingCount, pendingFiles, onAdd, onRemove, disabled }) {
  const [dragOver, setDragOver] = useState(false);
  const total = existingCount + pendingFiles.length;
  const remaining = MAX_PROOF_FILES - total;
  const canAdd = !disabled && remaining > 0;

  function ingest(list) {
    if (!list?.length) return;
    onAdd(list);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
        <span className="font-medium text-slate-800">
          {total} / {MAX_PROOF_FILES} proof files
        </span>
        <span className="text-xs text-slate-500">
          {remaining > 0 ? `${remaining} more allowed` : 'Limit reached'}
        </span>
      </div>

      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          !canAdd
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
            : dragOver
              ? 'border-teal-500 bg-teal-50'
              : 'border-teal-200 bg-teal-50/40 hover:bg-teal-50'
        }`}
        onDragOver={(e) => {
          if (!canAdd) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!canAdd) return;
          ingest(e.dataTransfer.files);
        }}
      >
        <Upload className="text-teal-700" size={24} />
        <p className="mt-2 text-sm font-semibold text-slate-800">
          {canAdd ? 'Add proof files' : 'Maximum files reached'}
        </p>
        <p className="mt-1 text-xs text-slate-500">Drop or click · multiple files · up to 5MB each</p>
        <input
          className="hidden"
          type="file"
          multiple
          disabled={!canAdd}
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => {
            ingest(e.target.files || []);
            e.target.value = '';
          }}
        />
      </label>

      {pendingFiles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ready to upload ({pendingFiles.length})
          </p>
          {pendingFiles.map((file) => (
            <PendingFileRow
              key={fileIdentity(file)}
              file={file}
              onRemove={() => onRemove(fileIdentity(file))}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function WorkPage() {
  const qc = useQueryClient();
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const [mode, setMode] = useState('view');
  const [monthDate, setMonthDate] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hoursWorked, setHoursWorked] = useState(8);
  const [files, setFiles] = useState([]);

  const isToday = selectedDate === todayKey;
  const monthFrom = format(startOfMonth(monthDate), 'yyyy-MM-dd');
  const monthTo = format(endOfMonth(monthDate), 'yyyy-MM-dd');

  const { data: today, isLoading: loadingToday } = useQuery({
    queryKey: ['work-today'],
    queryFn: async () => (await api.get('/worklogs/today')).data.data,
  });

  const { data: monthLogs = [], isFetching: fetchingMonth } = useQuery({
    queryKey: ['work-month', monthFrom, monthTo],
    queryFn: async () =>
      (await api.get('/worklogs/me', { params: { from: monthFrom, to: monthTo, limit: 62 } })).data
        .data,
  });

  const { data: monthAttendance = [] } = useQuery({
    queryKey: ['my-attendance-workpage', monthFrom, monthTo],
    queryFn: async () =>
      (await api.get('/attendance/me', { params: { from: monthFrom, to: monthTo } })).data.data,
  });

  const attendanceByDate = useMemo(() => {
    const map = {};
    for (const row of monthAttendance) map[row.date] = row;
    return map;
  }, [monthAttendance]);

  const dayMap = useMemo(() => {
    const map = {};
    const logsByDate = Object.fromEntries(monthLogs.map((w) => [w.date, w]));
    if (today && !logsByDate[today.date]) logsByDate[today.date] = today;

    for (const d of eachDayOfInterval({ start: parseISO(monthFrom), end: parseISO(monthTo) })) {
      const key = format(d, 'yyyy-MM-dd');
      const wd = getDay(d);
      const isWeekend = wd === 0 || wd === 6;
      const att = attendanceByDate[key];
      const log = logsByDate[key];
      map[key] = {
        submitted: Boolean(log && log.status === 'submitted'),
        attendance: att?.status || (isWeekend ? 'weekend' : null),
        isFuture: key > todayKey,
        weekday: !isWeekend,
        workLog: log || null,
      };
    }
    return map;
  }, [monthLogs, monthAttendance, monthFrom, monthTo, today, todayKey, attendanceByDate]);

  const monthStats = useMemo(() => {
    const days = Object.values(dayMap).filter((d) => !d.isFuture && d.weekday);
    const submitted = days.filter((d) => d.submitted).length;
    const missing = days.filter(
      (d) => !d.submitted && !['on_leave', 'holiday', 'weekend'].includes(d.attendance)
    ).length;
    const hours = monthLogs.reduce((sum, w) => sum + (w.hoursWorked || 0), 0);
    const files = monthLogs.reduce((sum, w) => sum + (w.attachments?.length || 0), 0);
    return { submitted, missing, total: days.length, hours, files };
  }, [dayMap, monthLogs]);

  const selectedWork = useMemo(() => {
    if (isToday && today) return today;
    return dayMap[selectedDate]?.workLog || null;
  }, [selectedDate, isToday, today, dayMap]);

  const selectedAttendance = attendanceByDate[selectedDate] || null;
  const canEdit = isToday && (!selectedWork || !selectedWork.locked);
  const submittedToday = today?.status === 'submitted';

  const monthTimeline = useMemo(
    () =>
      [...monthLogs]
        .filter((w) => w.status === 'submitted')
        .sort((a, b) => b.date.localeCompare(a.date)),
    [monthLogs]
  );

  useEffect(() => {
    if (!loadingToday) setMode(today ? 'view' : 'edit');
  }, [loadingToday, today?._id]);

  useEffect(() => {
    if (mode === 'edit' && isToday) {
      setTitle(today?.title || '');
      setDescription(today?.description || '');
      setHoursWorked(today?.hoursWorked || 8);
    }
  }, [mode, isToday, today]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('hoursWorked', String(hoursWorked));
      form.append('status', 'submitted');
      form.append('date', todayKey);
      for (const f of files) form.append('files', f);
      return (await api.post('/worklogs', form)).data;
    },
    onSuccess: (res) => {
      toast.success(
        `Saved · Attendance: ${res.data.attendance?.status?.replaceAll('_', ' ') || 'updated'}`
      );
      setFiles([]);
      setMode('view');
      qc.invalidateQueries({ queryKey: ['work-today'] });
      qc.invalidateQueries({ queryKey: ['work-month'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
      qc.invalidateQueries({ queryKey: ['my-attendance-workpage'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Submit failed'),
  });

  const removeMutation = useMutation({
    mutationFn: async (key) =>
      api.delete(`/worklogs/${today._id}/attachments`, { data: { key } }),
    onSuccess: () => {
      toast.success('Attachment removed');
      qc.invalidateQueries({ queryKey: ['work-today'] });
      qc.invalidateQueries({ queryKey: ['work-month'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not remove file'),
  });

  function addFiles(list) {
    const incoming = [...list];
    if (!incoming.length) return;
    const existingCount = today?.attachments?.length || 0;
    setFiles((prev) => {
      const merged = [...prev];
      for (const file of incoming) {
        if (existingCount + merged.length >= MAX_PROOF_FILES) {
          toast.error(`Maximum ${MAX_PROOF_FILES} files per day`);
          break;
        }
        const id = fileIdentity(file);
        if (!merged.some((f) => fileIdentity(f) === id)) merged.push(file);
      }
      return merged;
    });
  }

  function selectDate(date) {
    setSelectedDate(date);
    if (date === todayKey && !today) setMode('edit');
    else setMode('view');
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="My daily work"
        subtitle="Submit daily work with proof — attendance is marked automatically"
        actions={
          <Link to="/app/attendance" className="btn btn-secondary cursor-pointer">
            <CalendarDays size={16} /> Attendance
          </Link>
        }
      />

      {/* Month overview */}
      <div className="hero-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              {format(monthDate, 'MMMM yyyy')}
              {fetchingMonth ? ' · updating…' : ''}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {submittedToday ? 'Today’s work is submitted' : 'Submit today’s work'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {attendanceByDate[todayKey]
                ? `Today’s attendance: ${String(attendanceByDate[todayKey].status).replaceAll('_', ' ')}`
                : 'Pick any day on the calendar to review your submissions.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatPill label="Submitted" value={monthStats.submitted} tone="ok" />
            <StatPill label="Missing" value={monthStats.missing} tone="danger" />
            <StatPill label="Work days" value={monthStats.total} tone="brand" />
            <StatPill label="Hours" value={monthStats.hours} tone="neutral" />
            <StatPill label="Files" value={monthStats.files} tone="neutral" />
          </div>
        </div>

        {isToday && canEdit ? (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-teal-100 pt-4">
            {mode === 'view' ? (
              <button
                type="button"
                className="btn btn-primary cursor-pointer"
                onClick={() => {
                  setSelectedDate(todayKey);
                  setMode('edit');
                }}
              >
                <Pencil size={16} />
                {submittedToday ? 'Edit today’s work' : 'Submit today’s work'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary cursor-pointer"
                onClick={() => setMode('view')}
                disabled={!today && !submittedToday}
              >
                <Eye size={15} /> View submission
              </button>
            )}
            {submittedToday ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">
                <CheckCircle2 size={15} /> Submitted today
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-100">
                <AlertCircle size={15} /> Due today
              </span>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        {/* Calendar column */}
        <div className="space-y-4">
          <WorkMonthCalendar
            monthDate={monthDate}
            selectedDate={selectedDate}
            onMonthChange={setMonthDate}
            onSelectDate={selectDate}
            dayMap={dayMap}
            today={todayKey}
          />

          <div className="card-surface overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">This month</p>
              <p className="text-xs text-slate-500">All submissions — click to open</p>
            </div>
            <ul className="max-h-56 divide-y divide-slate-100 overflow-auto">
              {monthTimeline.length === 0 ? (
                <li className="p-4 text-sm text-slate-500">No submissions this month</li>
              ) : (
                monthTimeline.map((log) => (
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
                          {format(parseISO(log.date), 'dd MMM · EEEE')}
                        </p>
                        <p className="truncate text-sm text-slate-600">{log.title}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-0.5 text-xs text-slate-500">
                        <span>{log.hoursWorked || 0}h</span>
                        <span>{log.attachments?.length || 0} files</span>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Main panel */}
        <section className="min-w-0 space-y-4">
          {mode === 'view' || !isToday ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {isToday
                      ? 'Today’s submission'
                      : format(parseISO(selectedDate), 'EEEE, dd MMM yyyy')}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {isToday
                      ? 'What admin sees for your attendance proof'
                      : 'Past submissions are view-only'}
                  </p>
                </div>
                {canEdit && mode === 'view' ? (
                  <button
                    type="button"
                    className="btn btn-primary cursor-pointer"
                    onClick={() => setMode('edit')}
                  >
                    <Pencil size={15} /> Edit
                  </button>
                ) : null}
              </div>

              {loadingToday && isToday ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : (
                <WorkDetailPanel
                  work={selectedWork}
                  attendance={selectedAttendance}
                  date={selectedDate}
                  emptyHint={
                    isToday
                      ? 'Click “Submit today’s work” to add your first update.'
                      : 'No work was submitted on this date.'
                  }
                />
              )}

              {isToday && !selectedWork && mode === 'view' ? (
                <button
                  type="button"
                  className="btn btn-primary cursor-pointer"
                  onClick={() => setMode('edit')}
                >
                  <Upload size={16} /> Submit today’s work
                </button>
              ) : null}
            </>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim() || !description.trim()) {
                  toast.error('Title and description are required');
                  return;
                }
                const hasFiles =
                  files.length > 0 || (today?.attachments && today.attachments.length > 0);
                if (!hasFiles) {
                  toast.error('Add at least one proof file');
                  return;
                }
                saveMutation.mutate();
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {submittedToday ? 'Update today’s work' : 'Submit today’s work'}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Title, description, hours, and at least one proof file
                  </p>
                </div>
                {today ? (
                  <button
                    type="button"
                    className="btn btn-secondary cursor-pointer"
                    onClick={() => setMode('view')}
                  >
                    <X size={15} /> Cancel
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="card-surface space-y-4 p-5">
                  <FormField label="Work title">
                    <input
                      className="input"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="e.g. Completed ticket fixes and client report"
                    />
                  </FormField>

                  <FormField label="What did you do today?">
                    <textarea
                      className="textarea min-h-[220px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      placeholder={`Write clearly, for example:\n1. Fixed login bug\n2. Updated dashboard UI\n3. Shared screenshots with manager`}
                    />
                  </FormField>

                  <FormField label="Hours worked">
                    <div className="relative max-w-[200px]">
                      <Clock3
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        className="input input-icon-left"
                        type="number"
                        min={0.5}
                        max={24}
                        step={0.5}
                        value={hoursWorked}
                        onChange={(e) => setHoursWorked(e.target.value)}
                        required
                      />
                    </div>
                  </FormField>
                </div>

                <div className="card-surface space-y-4 p-5">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Proof files</p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Screenshots or documents for today&apos;s work
                    </p>
                  </div>

                  {today?.attachments?.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Already attached ({today.attachments.length})
                      </p>
                      <div className="space-y-2">
                        {today.attachments.map((file) => (
                          <ProofFileRow
                            key={file.key}
                            file={file}
                            onRemove={
                              today.locked ? undefined : (key) => removeMutation.mutate(key)
                            }
                            removing={
                              removeMutation.isPending &&
                              removeMutation.variables === file.key
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <ProofUploadZone
                    existingCount={today?.attachments?.length || 0}
                    pendingFiles={files}
                    onAdd={addFiles}
                    onRemove={(id) => setFiles((prev) => prev.filter((f) => fileIdentity(f) !== id))}
                    disabled={today?.locked}
                  />

                  <button
                    className="btn btn-primary w-full cursor-pointer"
                    type="submit"
                    disabled={saveMutation.isPending}
                  >
                    <Upload size={16} />
                    {saveMutation.isPending
                      ? 'Saving…'
                      : submittedToday
                        ? 'Save changes'
                        : 'Submit work & mark attendance'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {!fetchingMonth && monthTimeline.length === 0 && !today ? (
            <EmptyState
              title="No daily work yet"
              hint="Submit your first update for today with title, description, and proof files."
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
