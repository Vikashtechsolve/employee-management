import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isPast } from 'date-fns';
import {
  Plus,
  Search,
  Ticket,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  Filter,
  UserRound,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, PageHeader } from '../components/ui';
import { useAuthStore } from '../store/authStore';

function Metric({ label, value, icon: Icon, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-white text-stone-800 border-stone-200',
    brand: 'bg-teal-50 text-teal-950 border-teal-200',
    warn: 'bg-amber-50 text-amber-950 border-amber-200',
    danger: 'bg-rose-50 text-rose-950 border-rose-200',
    ok: 'bg-emerald-50 text-emerald-950 border-emerald-200',
  };
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">{label}</p>
        <Icon size={15} className="opacity-70" />
      </div>
      <p className="font-display mt-1 text-2xl">{value}</p>
    </div>
  );
}

export default function TicketsPage() {
  const isManagerPlus = useAuthStore((s) => s.isManagerPlus());
  const isAdminLike = useAuthStore((s) => s.isAdminLike());
  const qc = useQueryClient();

  const [scope, setScope] = useState(isManagerPlus ? 'team' : 'mine');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    dueDate: '',
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', scope],
    queryFn: async () =>
      (await api.get('/tickets', { params: { scope, limit: 100 } })).data.data,
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

  // Also include managers for admin assignment
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

  const filtered = useMemo(() => {
    let list = tickets;
    if (statusFilter) list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter) list = list.filter((t) => t.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.assignee?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tickets, statusFilter, priorityFilter, search]);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => !['done', 'cancelled'].includes(t.status)).length;
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
    const overdue = tickets.filter(
      (t) =>
        t.dueDate &&
        isPast(new Date(t.dueDate)) &&
        !['done', 'cancelled'].includes(t.status)
    ).length;
    const done = tickets.filter((t) => t.status === 'done').length;
    return { open, inProgress, overdue, done, total: tickets.length };
  }, [tickets]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      return api.post('/tickets', fd);
    },
    onSuccess: () => {
      toast.success('Ticket assigned');
      setShowCreate(false);
      setForm({
        title: '',
        description: '',
        priority: 'medium',
        assignee: '',
        dueDate: '',
      });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tickets"
        subtitle="Assign tasks, track deadlines, and manage delivery"
        actions={
          isManagerPlus ? (
            <button type="button" className="btn-cta" onClick={() => setShowCreate(true)}>
              <span className="btn-cta-icon">
                <Plus size={16} />
              </span>
              <span className="text-left">
                <span className="block">Assign ticket</span>
                <span className="btn-cta-sub">Create task with deadline</span>
              </span>
            </button>
          ) : null
        }
      />

      <section className="overflow-hidden rounded-[28px] border border-indigo-200 bg-[linear-gradient(135deg,#eef2ff_0%,#fffcf7_55%,#f0fdfa_100%)] p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-800">
              Task board
            </p>
            <h2 className="font-display mt-2 text-3xl text-stone-900">
              {stats.open} open ticket{stats.open === 1 ? '' : 's'}
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {stats.overdue} overdue · {stats.inProgress} in progress · {stats.done} done
            </p>
          </div>
          {isManagerPlus ? (
            <select
              className="select w-auto bg-white"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="mine">My tickets</option>
              <option value="team">{isAdminLike ? 'All tickets' : 'Team tickets'}</option>
            </select>
          ) : null}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Open" value={stats.open} icon={Ticket} tone="brand" />
          <Metric label="In progress" value={stats.inProgress} icon={Clock3} tone="warn" />
          <Metric label="Overdue" value={stats.overdue} icon={AlertTriangle} tone="danger" />
          <Metric label="Done" value={stats.done} icon={CheckCircle2} tone="ok" />
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
            placeholder="Search ticket, number, or assignee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-stone-400" />
          <select
            className="select w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {['open', 'in_progress', 'blocked', 'in_review', 'done', 'cancelled'].map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
          <select
            className="select w-auto"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All priorities</option>
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showCreate ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="card-surface relative overflow-hidden p-5 sm:p-6"
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-stone-900">Assign a new ticket</h3>
              <p className="text-sm text-stone-500">
                Give a clear title, assignee, priority, and due date
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary px-2"
              onClick={() => setShowCreate(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold md:col-span-2">
              Title
              <input
                className="input mt-1"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Fix payroll export bug"
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              Description
              <textarea
                className="textarea mt-1 min-h-[120px]"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Explain the task, expected output, and any constraints…"
              />
            </label>
            <label className="text-sm font-semibold">
              Priority
              <select
                className="select mt-1"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              Assignee
              <select
                className="select mt-1"
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
              >
                <option value="">Unassigned</option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.employeeId})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Due date
              <input
                className="input mt-1"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </label>
            <div className="flex items-end gap-2">
              <button className="btn-cta" type="submit" disabled={createMutation.isPending}>
                <span className="btn-cta-icon">
                  <Plus size={16} />
                </span>
                <span>{createMutation.isPending ? 'Creating…' : 'Create ticket'}</span>
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      ) : null}

      {isLoading ? (
        <p className="text-stone-500">Loading tickets…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No tickets found"
          hint={
            isManagerPlus
              ? 'Assign a ticket to get started, or clear filters.'
              : 'No tickets match your filters.'
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => {
            const overdue =
              t.dueDate &&
              isPast(new Date(t.dueDate)) &&
              !['done', 'cancelled'].includes(t.status);
            return (
              <Link
                key={t._id}
                to={`/app/tickets/${t._id}`}
                className={`group rounded-3xl border bg-[var(--bg-elevated)] p-5 transition hover:-translate-y-0.5 hover:shadow-md ${
                  overdue
                    ? 'border-rose-200 hover:border-rose-300'
                    : 'border-[var(--line)] hover:border-teal-700/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                      {t.ticketNumber}
                    </p>
                    <h3 className="mt-1 font-semibold text-stone-900 group-hover:text-teal-900">
                      {t.title}
                    </h3>
                  </div>
                  <Badge value={t.priority} />
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-stone-500">
                  {t.description || 'No description'}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge value={t.status} />
                  {overdue ? (
                    <span className="badge bg-rose-100 text-rose-800">Overdue</span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3 text-xs text-stone-500">
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <UserRound size={13} />
                    {t.assignee?.name || 'Unassigned'}
                  </span>
                  <span>
                    {t.dueDate ? `Due ${format(new Date(t.dueDate), 'dd MMM')}` : 'No due date'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
