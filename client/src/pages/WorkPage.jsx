import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import {
  Upload,
  FileImage,
  Clock3,
  CheckCircle2,
  Paperclip,
  Pencil,
  Eye,
  Trash2,
  CalendarDays,
  AlertCircle,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, PageHeader } from '../components/ui';

function fileLabel(file) {
  return file.originalName || file.name || 'file';
}

function AttachmentList({ files = [], onRemove, removingKey }) {
  if (!files.length) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
        No proof files attached yet
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {files.map((file) => {
        const key = file.key || `${file.name}-${file.size}`;
        const isImage = String(file.mimeType || '').startsWith('image/');
        return (
          <li
            key={key}
            className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-3 py-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
              <FileImage size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900">{fileLabel(file)}</p>
              <p className="text-xs text-stone-500">
                {isImage ? 'Image' : 'Document'}
                {file.size ? ` · ${Math.max(1, Math.round(file.size / 1024))} KB` : ''}
              </p>
            </div>
            {file.url && !String(file.url).startsWith('local-dev://') ? (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-teal-800"
              >
                Open
              </a>
            ) : null}
            {onRemove ? (
              <button
                type="button"
                className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                disabled={removingKey === file.key}
                onClick={() => onRemove(file.key)}
                title="Remove file"
              >
                <Trash2 size={15} />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function WorkDetailCard({ work, attendance, emptyHint }) {
  if (!work) {
    return (
      <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/60 p-6 text-center">
        <AlertCircle className="mx-auto text-amber-700" size={28} />
        <p className="font-display mt-3 text-xl text-stone-900">No work submitted</p>
        <p className="mt-1 text-sm text-stone-600">
          {emptyHint || 'Fill the form and submit with proof files to mark attendance.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--bg-elevated)]">
      <div className="border-b border-[var(--line)] bg-gradient-to-r from-teal-950 to-stone-900 px-5 py-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-200/80">
              {work.date}
              {work.submittedAt
                ? ` · submitted ${format(new Date(work.submittedAt), 'dd MMM, HH:mm')}`
                : ''}
            </p>
            <h3 className="font-display mt-2 text-2xl sm:text-3xl">{work.title}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge value={work.status} />
            {attendance?.status ? <Badge value={attendance.status} /> : null}
            {work.locked ? <span className="badge bg-stone-200 text-stone-700">Locked</span> : null}
            {work.reviewedAt ? <span className="badge bg-emerald-100 text-emerald-800">Reviewed</span> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4 border-b border-[var(--line)] p-5 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap gap-4 text-sm text-stone-600">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} /> {work.hoursWorked || 0} hours
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Paperclip size={14} /> {work.attachments?.length || 0} proof files
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Work description
            </p>
            <div className="mt-2 whitespace-pre-wrap rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-700">
              {work.description}
            </div>
          </div>

          {work.adminNote ? (
            <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-teal-950">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Admin note</p>
              <p className="mt-1">{work.adminNote}</p>
            </div>
          ) : null}
        </div>

        <div className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">
            Proof / screenshots
          </p>
          <AttachmentList files={work.attachments || []} />
        </div>
      </div>
    </div>
  );
}

export default function WorkPage() {
  const qc = useQueryClient();
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const [mode, setMode] = useState('view'); // view | edit
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hoursWorked, setHoursWorked] = useState(8);
  const [files, setFiles] = useState([]);
  const [previewNames, setPreviewNames] = useState([]);

  const isToday = selectedDate === todayKey;

  const { data: today, isLoading: loadingToday } = useQuery({
    queryKey: ['work-today'],
    queryFn: async () => (await api.get('/worklogs/today')).data.data,
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['work-history'],
    queryFn: async () => (await api.get('/worklogs/me', { params: { limit: 60 } })).data.data,
  });

  const { data: attendanceRows = [] } = useQuery({
    queryKey: ['my-attendance-workpage'],
    queryFn: async () => {
      const month = format(new Date(), 'yyyy-MM');
      return (await api.get('/attendance/me', { params: { month } })).data.data;
    },
  });

  const attendanceByDate = useMemo(() => {
    const map = {};
    for (const row of attendanceRows) map[row.date] = row;
    return map;
  }, [attendanceRows]);

  const selectedWork = useMemo(() => {
    if (selectedDate === todayKey) return today || null;
    return history.find((w) => w.date === selectedDate) || null;
  }, [selectedDate, todayKey, today, history]);

  const selectedAttendance = attendanceByDate[selectedDate] || null;
  const canEdit = isToday && selectedWork && !selectedWork.locked;
  const canCreateToday = isToday && !today?.locked;
  const submitted = today?.status === 'submitted';

  useEffect(() => {
    // Default to edit if nothing submitted today; otherwise view
    if (!loadingToday) {
      setMode(today ? 'view' : 'edit');
    }
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
      setPreviewNames([]);
      setMode('view');
      qc.invalidateQueries({ queryKey: ['work-today'] });
      qc.invalidateQueries({ queryKey: ['work-history'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
      qc.invalidateQueries({ queryKey: ['my-attendance-workpage'] });
      qc.invalidateQueries({ queryKey: ['attendance-today-hint'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Submit failed'),
  });

  const removeMutation = useMutation({
    mutationFn: async (key) =>
      api.delete(`/worklogs/${today._id}/attachments`, { data: { key } }),
    onSuccess: () => {
      toast.success('Attachment removed');
      qc.invalidateQueries({ queryKey: ['work-today'] });
      qc.invalidateQueries({ queryKey: ['work-history'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not remove file'),
  });

  function onPickFiles(list) {
    const arr = [...list];
    setFiles(arr);
    setPreviewNames(arr.map((f) => f.name));
  }

  function selectHistoryDate(date) {
    setSelectedDate(date);
    setMode(date === todayKey && !today ? 'edit' : 'view');
  }

  return (
    <div>
      <PageHeader
        title="My daily work"
        subtitle="Submit, view, and update your daily tasks — this marks your attendance"
        actions={
          <Link to="/app/attendance" className="btn btn-secondary">
            <CalendarDays size={16} /> Attendance
          </Link>
        }
      />

      {/* Status strip */}
      <section
        className={`mb-5 rounded-3xl border p-5 sm:p-6 ${
          submitted
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50'
            : 'border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`rounded-2xl p-3 ${
                submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {submitted ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                Today · {format(new Date(), 'EEEE, dd MMM yyyy')}
              </p>
              <h2 className="font-display mt-1 text-2xl text-stone-900">
                {submitted ? 'Today’s work is submitted' : 'Submit today’s work'}
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                {attendanceByDate[todayKey]
                  ? `Attendance: ${String(attendanceByDate[todayKey].status).replaceAll('_', ' ')}`
                  : 'Attendance will be marked Present or Late after you submit with proof.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {attendanceByDate[todayKey] ? (
              <Badge value={attendanceByDate[todayKey].status} />
            ) : (
              <Badge value="pending" />
            )}
            <Badge value={submitted ? 'submitted' : 'pending'} />
            {isToday && canCreateToday ? (
              mode === 'view' ? (
                <button
                  type="button"
                  className="btn-cta"
                  onClick={() => {
                    setSelectedDate(todayKey);
                    setMode('edit');
                  }}
                >
                  <span className="btn-cta-icon">
                    <Pencil size={16} />
                  </span>
                  <span className="text-left">
                    <span className="block">
                      {submitted ? 'Edit today’s work' : 'Write today’s work'}
                    </span>
                    <span className="btn-cta-sub">
                      {submitted ? 'Update details and proof' : 'Submit to mark attendance'}
                    </span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setMode('view')}
                  disabled={!today}
                >
                  <Eye size={15} /> View submission
                </button>
              )
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        {/* History rail */}
        <aside className="card-surface max-h-[78vh] overflow-hidden">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="font-display text-lg">Your submissions</p>
            <p className="text-xs text-stone-500">Click a day to view details</p>
          </div>
          <div className="max-h-[70vh] overflow-auto p-2">
            {/* Always show today entry */}
            <button
              type="button"
              onClick={() => selectHistoryDate(todayKey)}
              className={`mb-1 flex w-full flex-col rounded-2xl px-3 py-3 text-left transition ${
                selectedDate === todayKey
                  ? 'bg-teal-900 text-white'
                  : 'hover:bg-stone-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Today</span>
                <span
                  className={`text-[10px] font-bold uppercase ${
                    selectedDate === todayKey ? 'text-teal-100' : 'text-teal-800'
                  }`}
                >
                  {submitted ? 'Done' : 'Due'}
                </span>
              </div>
              <span
                className={`mt-1 truncate text-xs ${
                  selectedDate === todayKey ? 'text-teal-100/80' : 'text-stone-500'
                }`}
              >
                {today?.title || 'No submission yet'}
              </span>
            </button>

            {loadingHistory ? (
              <p className="px-3 py-4 text-sm text-stone-500">Loading history…</p>
            ) : (
              history
                .filter((w) => w.date !== todayKey)
                .map((w) => {
                  const active = selectedDate === w.date;
                  return (
                    <button
                      key={w._id}
                      type="button"
                      onClick={() => selectHistoryDate(w.date)}
                      className={`mb-1 flex w-full flex-col rounded-2xl px-3 py-3 text-left transition ${
                        active ? 'bg-teal-900 text-white' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {format(parseISO(w.date), 'dd MMM yyyy')}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            active ? 'text-teal-100' : 'text-stone-500'
                          }`}
                        >
                          {w.attachments?.length || 0} files
                        </span>
                      </div>
                      <span
                        className={`mt-1 truncate text-xs ${
                          active ? 'text-teal-100/80' : 'text-stone-500'
                        }`}
                      >
                        {w.title}
                      </span>
                    </button>
                  );
                })
            )}

            {!loadingHistory && history.filter((w) => w.date !== todayKey).length === 0 ? (
              <p className="px-3 py-4 text-sm text-stone-500">No earlier submissions yet</p>
            ) : null}
          </div>
        </aside>

        {/* Main panel */}
        <section className="min-w-0 space-y-4">
          {mode === 'view' || !isToday ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-xl text-stone-900">
                    {isToday
                      ? 'Today’s submission'
                      : format(parseISO(selectedDate), 'EEEE, dd MMM yyyy')}
                  </h3>
                  <p className="text-sm text-stone-500">
                    {isToday
                      ? 'This is what admin sees for your attendance proof'
                      : 'Past submissions are view-only'}
                  </p>
                </div>
                {canEdit ? (
                  <button type="button" className="btn-cta" onClick={() => setMode('edit')}>
                    <span className="btn-cta-icon">
                      <Pencil size={16} />
                    </span>
                    <span className="text-left">
                      <span className="block">Edit today’s work</span>
                      <span className="btn-cta-sub">Change details or add proof</span>
                    </span>
                  </button>
                ) : null}
              </div>

              {loadingToday && isToday ? (
                <p className="text-stone-500">Loading today’s work…</p>
              ) : (
                <WorkDetailCard
                  work={selectedWork}
                  attendance={selectedAttendance}
                  emptyHint={
                    isToday
                      ? 'Click “Write today’s work” to submit your first update.'
                      : 'No work was submitted on this date.'
                  }
                />
              )}

              {isToday && !selectedWork ? (
                <button
                  type="button"
                  className="btn-cta"
                  onClick={() => setMode('edit')}
                >
                  <span className="btn-cta-icon">
                    <Upload size={16} />
                  </span>
                  <span className="text-left">
                    <span className="block">Write today’s work</span>
                    <span className="btn-cta-sub">Submit with proof to mark attendance</span>
                  </span>
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
                  toast.error('Add at least one proof file (screenshot/document)');
                  return;
                }
                saveMutation.mutate();
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-xl text-stone-900">
                    {submitted ? 'Update today’s work' : 'Submit today’s work'}
                  </h3>
                  <p className="text-sm text-stone-500">
                    Title, description, hours, and proof files are required
                  </p>
                </div>
                {today ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setMode('view')}
                  >
                    <X size={15} /> Cancel
                  </button>
                ) : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="card-surface space-y-4 p-5">
                  <label className="block text-sm font-semibold text-stone-800">
                    Work title
                    <input
                      className="input mt-1"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="e.g. Completed ticket fixes and client report"
                    />
                  </label>

                  <label className="block text-sm font-semibold text-stone-800">
                    What did you do today?
                    <textarea
                      className="textarea mt-1 min-h-[240px]"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      placeholder={`Write clearly, for example:\n1. Fixed login bug\n2. Updated dashboard UI\n3. Shared screenshots with manager`}
                    />
                  </label>

                  <label className="block text-sm font-semibold text-stone-800">
                    Hours worked
                    <div className="relative mt-1 max-w-[200px]">
                      <Clock3
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                      />
                      <input
                        className="input pl-9"
                        type="number"
                        min={0.5}
                        max={24}
                        step={0.5}
                        value={hoursWorked}
                        onChange={(e) => setHoursWorked(e.target.value)}
                        required
                      />
                    </div>
                  </label>
                </div>

                <div className="card-surface space-y-4 p-5">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">Proof files</p>
                    <p className="mt-1 text-sm text-stone-500">
                      Screenshots or documents that prove your work
                    </p>
                  </div>

                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-teal-700/35 bg-teal-50/50 px-4 py-8 text-center transition hover:bg-teal-50">
                    <Upload className="text-teal-800" size={26} />
                    <p className="mt-3 font-semibold text-stone-800">Upload proof</p>
                    <p className="mt-1 text-xs text-stone-500">
                      PNG, JPG, WEBP, PDF, DOC · up to 5MB each
                    </p>
                    <input
                      className="hidden"
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => onPickFiles(e.target.files || [])}
                    />
                  </label>

                  {previewNames.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                        New files to upload
                      </p>
                      <ul className="space-y-2">
                        {previewNames.map((name) => (
                          <li
                            key={name}
                            className="flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-950"
                          >
                            <FileImage size={15} />
                            <span className="truncate">{name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {today?.attachments?.length ? (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                        Already attached
                      </p>
                      <AttachmentList
                        files={today.attachments}
                        onRemove={
                          today.locked
                            ? undefined
                            : (key) => removeMutation.mutate(key)
                        }
                        removingKey={
                          removeMutation.isPending ? removeMutation.variables : null
                        }
                      />
                    </div>
                  ) : null}

                  <button
                    className="btn-cta w-full"
                    type="submit"
                    disabled={saveMutation.isPending}
                  >
                    <span className="btn-cta-icon">
                      <Upload size={16} />
                    </span>
                    <span className="text-left">
                      <span className="block">
                        {saveMutation.isPending
                          ? 'Saving…'
                          : submitted
                            ? 'Save changes & update attendance'
                            : 'Submit work & mark attendance'}
                      </span>
                      <span className="btn-cta-sub">Visible to admin on Employee Work board</span>
                    </span>
                  </button>

                  <p className="text-center text-xs text-stone-500">
                    Use a clear title, full description, and at least one proof file
                  </p>
                </div>
              </div>
            </form>
          )}

          {!loadingHistory && history.length === 0 && !today ? (
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
