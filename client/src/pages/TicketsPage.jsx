import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isPast } from 'date-fns';
import {
  Plus,
  Search,
  UserRound,
  X,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, FormField, PageHeader, SectionCard, StatPill } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'in_review', label: 'In review' },
  { id: 'done', label: 'Done' },
];

function TicketCard({ ticket }) {
  const overdue =
    ticket.dueDate &&
    isPast(new Date(ticket.dueDate)) &&
    !['done', 'cancelled'].includes(ticket.status);

  return (
    <Link
      to={`/app/tickets/${ticket._id}`}
      className={`card-surface card-surface-hover block p-4 transition ${
        overdue ? 'ring-1 ring-rose-200' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">{ticket.ticketNumber}</p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-900">{ticket.title}</h3>
        </div>
        <Badge value={ticket.priority} />
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-slate-600">
        {ticket.description || 'No description'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge value={ticket.status} />
        {overdue ? (
          <span className="badge bg-rose-50 text-rose-700 ring-1 ring-rose-100">Overdue</span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1 truncate">
          <UserRound size={13} />
          {ticket.assignee?.name || 'Unassigned'}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          {ticket.dueDate ? (
            <>
              <CalendarDays size={12} />
              Due {format(new Date(ticket.dueDate), 'dd MMM')}
            </>
          ) : (
            'No due date'
          )}
          <ArrowRight size={14} className="text-slate-300" />
        </span>
      </div>
    </Link>
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
    return list.sort((a, b) => {
      const aOver =
        a.dueDate && isPast(new Date(a.dueDate)) && !['done', 'cancelled'].includes(a.status);
      const bOver =
        b.dueDate && isPast(new Date(b.dueDate)) && !['done', 'cancelled'].includes(b.status);
      if (aOver !== bOver) return aOver ? -1 : 1;
      return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
    });
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
      toast.success('Ticket created');
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

  const employeeView = !isManagerPlus;

  return (
    <div className="space-y-5">
      <PageHeader
        title={employeeView ? 'My tickets' : 'Tickets'}
        subtitle={
          employeeView
            ? 'Tasks assigned to you — update status, add comments, and attach proof'
            : 'Assign tasks, track deadlines, and manage team delivery'
        }
        actions={
          isManagerPlus ? (
            <button
              type="button"
              className="btn btn-primary cursor-pointer"
              onClick={() => setShowCreate((v) => !v)}
            >
              <Plus size={16} />
              {showCreate ? 'Close' : 'Assign ticket'}
            </button>
          ) : null
        }
      />

      <div className="hero-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              {employeeView ? 'Your tasks' : 'Task board'}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {stats.open} open ticket{stats.open === 1 ? '' : 's'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {stats.overdue > 0 ? (
                <span className="font-medium text-rose-700">{stats.overdue} overdue · </span>
              ) : null}
              {stats.inProgress} in progress · {stats.done} completed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {isManagerPlus ? (
              <select
                className="select w-auto cursor-pointer bg-white text-sm"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
              >
                <option value="mine">My tickets</option>
                <option value="team">{isAdminLike ? 'All tickets' : 'Team tickets'}</option>
              </select>
            ) : null}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatPill label="Open" value={stats.open} tone="brand" />
              <StatPill label="In progress" value={stats.inProgress} tone="warn" />
              <StatPill label="Overdue" value={stats.overdue} tone="danger" />
              <StatPill label="Done" value={stats.done} tone="ok" />
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        title="Tickets"
        subtitle={`${filtered.length} shown`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px]">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="input input-icon-left cursor-text text-sm"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select w-auto cursor-pointer text-sm"
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
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id || 'all'}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`cursor-pointer rounded-xl px-3 py-2 text-sm font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-200'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading tickets…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No tickets found"
            hint={
              employeeView
                ? 'No tasks match your filters. New assignments will appear here.'
                : 'Assign a ticket or clear filters to see results.'
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
              <TicketCard key={t._id} ticket={t} />
            ))}
          </div>
        )}
      </SectionCard>

      {showCreate && isManagerPlus ? (
        <SectionCard title="Assign new ticket" subtitle="Create a task with assignee, priority, and due date">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="grid gap-4 md:grid-cols-2"
          >
            <FormField label="Title" className="md:col-span-2">
              <input
                className="input"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Fix payroll export bug"
              />
            </FormField>
            <FormField label="Description" className="md:col-span-2">
              <textarea
                className="textarea min-h-[120px]"
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Explain the task and expected output…"
              />
            </FormField>
            <FormField label="Priority">
              <select
                className="select cursor-pointer"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {['low', 'medium', 'high', 'urgent'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Assignee">
              <select
                className="select cursor-pointer"
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
            </FormField>
            <FormField label="Due date">
              <input
                className="input cursor-pointer"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </FormField>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                className="btn btn-primary cursor-pointer"
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating…' : 'Create ticket'}
              </button>
              <button
                className="btn btn-secondary cursor-pointer"
                type="button"
                onClick={() => setShowCreate(false)}
              >
                <X size={16} /> Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}
    </div>
  );
}
