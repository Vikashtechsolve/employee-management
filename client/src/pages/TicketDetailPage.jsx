import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';
import {
  ArrowLeft,
  Clock3,
  Paperclip,
  Send,
  UserRound,
  AlertTriangle,
  Upload,
  Save,
} from 'lucide-react';
import api from '../api/client';
import { Badge } from '../components/ui';
import { useAuthStore } from '../store/authStore';

export default function TicketDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const isManagerPlus = useAuthStore((s) => s.isManagerPlus());
  const isAdminLike = useAuthStore((s) => s.isAdminLike());

  const { data, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => (await api.get(`/tickets/${id}`)).data.data,
  });

  const { data: assignees = [] } = useQuery({
    queryKey: ['ticket-assignees', isAdminLike],
    queryFn: async () => {
      if (isAdminLike) {
        return (
          await api.get('/users', {
            params: { limit: 100, role: 'employee', isActive: 'true' },
          })
        ).data.data;
      }
      return (await api.get('/users/team')).data.data;
    },
    enabled: isManagerPlus,
  });

  const { data: managers = [] } = useQuery({
    queryKey: ['ticket-managers'],
    queryFn: async () =>
      (await api.get('/users', { params: { limit: 50, role: 'manager', isActive: 'true' } }))
        .data.data,
    enabled: isAdminLike,
  });

  const assigneeOptions = useMemo(() => {
    const map = new Map();
    for (const u of [...assignees, ...managers]) map.set(u.id, u);
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [assignees, managers]);

  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    if (!data?.ticket) return;
    setStatus(data.ticket.status || '');
    setPriority(data.ticket.priority || 'medium');
    setAssignee(data.ticket.assignee?.id || data.ticket.assignee?._id || '');
    setDueDate(
      data.ticket.dueDate ? format(new Date(data.ticket.dueDate), 'yyyy-MM-dd') : ''
    );
  }, [data?.ticket]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (status) fd.append('status', status);
      if (isManagerPlus) {
        if (priority) fd.append('priority', priority);
        fd.append('assignee', assignee || '');
        fd.append('dueDate', dueDate || '');
      }
      for (const f of files) fd.append('files', f);
      return api.patch(`/tickets/${id}`, fd);
    },
    onSuccess: () => {
      toast.success('Ticket updated');
      setFiles([]);
      qc.invalidateQueries({ queryKey: ['ticket', id] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('body', comment);
      return api.post(`/tickets/${id}/comments`, fd);
    },
    onSuccess: () => {
      toast.success('Comment added');
      setComment('');
      qc.invalidateQueries({ queryKey: ['ticket', id] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (isLoading || !data) {
    return <p className="text-stone-500">Loading ticket…</p>;
  }

  const { ticket, comments } = data;
  const overdue =
    ticket.dueDate &&
    isPast(new Date(ticket.dueDate)) &&
    !['done', 'cancelled'].includes(ticket.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/tickets" className="btn btn-secondary">
          <ArrowLeft size={15} /> Back to tickets
        </Link>
        <div className="flex flex-wrap gap-2">
          <Badge value={ticket.priority} />
          <Badge value={ticket.status} />
          {overdue ? <span className="badge bg-rose-100 text-rose-800">Overdue</span> : null}
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[linear-gradient(135deg,#042f2e_0%,#134e4a_55%,#1c1917_100%)] text-white">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-200/80">
            {ticket.ticketNumber}
          </p>
          <h1 className="font-display mt-2 text-3xl sm:text-4xl">{ticket.title}</h1>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-teal-50/85">
            <span className="inline-flex items-center gap-1.5">
              <UserRound size={14} />
              {ticket.assignee?.name || 'Unassigned'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              {ticket.dueDate
                ? `Due ${format(new Date(ticket.dueDate), 'dd MMM yyyy')}`
                : 'No due date'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Paperclip size={14} />
              {ticket.attachments?.length || 0} files
            </span>
          </div>
          {overdue ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-500/20 px-3 py-2 text-sm text-rose-100">
              <AlertTriangle size={15} />
              This ticket is past its due date
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <div className="card-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Description
            </p>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
              {ticket.description}
            </div>
          </div>

          <div className="card-surface p-5">
            <h3 className="font-display text-xl text-stone-900">
              {isManagerPlus ? 'Manage ticket' : 'Update status'}
            </h3>
            <p className="mt-1 text-sm text-stone-500">
              {isManagerPlus
                ? 'Change status, assignee, priority, and attach proof'
                : 'Update progress and attach completion proof'}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-semibold">
                Status
                <select
                  className="select mt-1"
                  value={status || ticket.status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {['open', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'].map(
                    (s) => (
                      <option key={s} value={s}>
                        {s.replaceAll('_', ' ')}
                      </option>
                    )
                  )}
                </select>
              </label>

              {isManagerPlus ? (
                <label className="text-sm font-semibold">
                  Priority
                  <select
                    className="select mt-1"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {['low', 'medium', 'high', 'urgent'].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {isManagerPlus ? (
                <label className="text-sm font-semibold">
                  Assignee
                  <select
                    className="select mt-1"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {assigneeOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.employeeId})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {isManagerPlus ? (
                <label className="text-sm font-semibold">
                  Due date
                  <input
                    className="input mt-1"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
              ) : null}
            </div>

            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-teal-700/30 bg-teal-50/40 px-4 py-6 text-center transition hover:bg-teal-50">
              <Upload className="text-teal-800" size={22} />
              <p className="mt-2 text-sm font-semibold text-stone-800">Add proof files</p>
              <p className="text-xs text-stone-500">Optional screenshots or documents</p>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setFiles([...e.target.files])}
              />
            </label>
            {files.length > 0 ? (
              <p className="mt-2 text-sm text-teal-800">{files.length} file(s) ready to upload</p>
            ) : null}

            <button
              type="button"
              className="btn-cta mt-4"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              <span className="btn-cta-icon">
                <Save size={16} />
              </span>
              <span>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</span>
            </button>
          </div>

          <div className="card-surface p-5">
            <h3 className="font-display text-xl text-stone-900">Discussion</h3>
            <ul className="mt-4 space-y-3">
              {(comments || []).length === 0 ? (
                <li className="rounded-2xl bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">
                  No comments yet
                </li>
              ) : (
                comments.map((c) => (
                  <li
                    key={c._id}
                    className="rounded-2xl border border-[var(--line)] bg-stone-50 p-4 text-sm"
                  >
                    <p className="font-semibold text-stone-900">
                      {c.author?.name}{' '}
                      <span className="font-normal text-stone-500">
                        · {format(new Date(c.createdAt), 'dd MMM HH:mm')}
                      </span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-stone-700">{c.body}</p>
                  </li>
                ))
              )}
            </ul>
            <textarea
              className="textarea mt-4"
              placeholder="Write a comment or update…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={() => commentMutation.mutate()}
              disabled={!comment.trim() || commentMutation.isPending}
            >
              <Send size={15} /> Post comment
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card-surface p-5 text-sm">
            <h4 className="font-display text-lg text-stone-900">Details</h4>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Assignee
                </dt>
                <dd className="mt-1 font-semibold text-stone-800">
                  {ticket.assignee?.name || 'Unassigned'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Reporter
                </dt>
                <dd className="mt-1 font-semibold text-stone-800">
                  {ticket.reporter?.name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Department
                </dt>
                <dd className="mt-1 font-semibold text-stone-800">
                  {ticket.department?.name || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Created
                </dt>
                <dd className="mt-1 font-semibold text-stone-800">
                  {format(new Date(ticket.createdAt), 'dd MMM yyyy, HH:mm')}
                </dd>
              </div>
            </dl>
          </div>

          <div className="card-surface p-5">
            <h4 className="font-display text-lg text-stone-900">Attachments</h4>
            {(ticket.attachments || []).length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">No files yet</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {ticket.attachments.map((a) => (
                  <li
                    key={a.key}
                    className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-700"
                  >
                    {a.originalName}
                    <span className="ml-2 text-xs text-stone-400">
                      {Math.max(1, Math.round((a.size || 0) / 1024))} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-surface p-5">
            <h4 className="font-display text-lg text-stone-900">Activity</h4>
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto text-sm text-stone-600">
              {(ticket.activity || [])
                .slice()
                .reverse()
                .map((a, i) => (
                  <li key={i} className="rounded-xl bg-stone-50 px-3 py-2">
                    <span className="font-semibold capitalize text-stone-800">{a.action}</span>
                    {a.note ? ` · ${a.note}` : ''}
                    {a.at ? (
                      <span className="mt-0.5 block text-xs text-stone-400">
                        {format(new Date(a.at), 'dd MMM HH:mm')}
                      </span>
                    ) : null}
                  </li>
                ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
