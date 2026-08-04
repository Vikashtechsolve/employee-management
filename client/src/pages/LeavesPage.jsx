import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  CalendarRange,
  Paperclip,
  Palmtree,
  Plus,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, FormField, PageHeader, SectionCard, StatPill } from '../components/ui';

function BalanceCard({ balance }) {
  const remaining = balance.remaining ?? balance.allocated - balance.used - balance.pending;
  const pct = balance.allocated
    ? Math.min(100, Math.round((remaining / balance.allocated) * 100))
    : 0;

  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {balance.leaveType?.name}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{remaining}</p>
          <p className="text-xs text-slate-500">days remaining</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <Palmtree size={18} />
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Used {balance.used} · Pending {balance.pending} · Allocated {balance.allocated}
      </p>
    </div>
  );
}

function LeaveRequestCard({ leave, onCancel, cancelling }) {
  return (
    <article className="card-surface overflow-hidden transition hover:shadow-[var(--shadow-md)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/40 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{leave.leaveType?.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                <CalendarRange size={13} className="text-teal-600" />
                {format(parseISO(leave.startDate), 'dd MMM')} –{' '}
                {format(parseISO(leave.endDate), 'dd MMM yyyy')}
              </span>
              <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                {leave.days} day{leave.days === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <Badge value={leave.status} />
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{leave.reason}</p>
        </div>

        {(leave.attachments || []).length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Attachments
            </p>
            <ul className="mt-1.5 space-y-1">
              {leave.attachments.map((file) => (
                <li key={file.key}>
                  <a
                    href={file.url && !String(file.url).startsWith('local-dev://') ? file.url : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
                    onClick={async (e) => {
                      if (file.url && !String(file.url).startsWith('local-dev://')) return;
                      e.preventDefault();
                      try {
                        const { data } = await api.get('/files/signed-url', {
                          params: { key: file.key },
                        });
                        if (data.data?.url) window.open(data.data.url, '_blank');
                      } catch {
                        toast.error('Could not open file');
                      }
                    }}
                  >
                    <Paperclip size={14} />
                    {file.originalName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {leave.reviewNote ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review note</p>
            <p className="mt-1 text-slate-700">{leave.reviewNote}</p>
            {leave.reviewedBy?.name ? (
              <p className="mt-1 text-xs text-slate-500">By {leave.reviewedBy.name}</p>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs text-slate-400">
          Applied {format(new Date(leave.createdAt), 'dd MMM yyyy · HH:mm')}
        </p>

        {leave.status === 'pending' ? (
          <button
            type="button"
            className="btn btn-secondary cursor-pointer text-sm"
            disabled={cancelling}
            onClick={() => onCancel(leave._id)}
          >
            Cancel request
          </button>
        ) : null}
      </div>
    </article>
  );
}

const STATUS_TABS = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function LeavesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [files, setFiles] = useState([]);

  const { data: types = [] } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => (await api.get('/leaves/types')).data.data,
  });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: async () => (await api.get('/leaves/me')).data.data,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['my-balances'],
    queryFn: async () => (await api.get('/users/me/leave-balances')).data.data,
  });

  const enrichedBalances = useMemo(
    () =>
      balances.map((b) => ({
        ...b,
        remaining: b.allocated - b.used - b.pending,
      })),
    [balances]
  );

  const stats = useMemo(() => {
    const pending = leaves.filter((l) => l.status === 'pending').length;
    const approved = leaves.filter((l) => l.status === 'approved').length;
    const rejected = leaves.filter((l) => l.status === 'rejected').length;
    const totalRemaining = enrichedBalances.reduce((sum, b) => sum + (b.remaining || 0), 0);
    const daysPending = leaves
      .filter((l) => l.status === 'pending')
      .reduce((sum, l) => sum + (l.days || 0), 0);
    return { pending, approved, rejected, totalRemaining, daysPending, total: leaves.length };
  }, [leaves, enrichedBalances]);

  const filtered = useMemo(() => {
    let list = leaves;
    if (statusFilter) list = list.filter((l) => l.status === statusFilter);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [leaves, statusFilter]);

  const applyMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      for (const f of files) fd.append('files', f);
      return api.post('/leaves/apply', fd);
    },
    onSuccess: () => {
      toast.success('Leave request submitted');
      setForm({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      setFiles([]);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      qc.invalidateQueries({ queryKey: ['my-balances'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/leaves/${id}/cancel`),
    onSuccess: () => {
      toast.success('Request cancelled');
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      qc.invalidateQueries({ queryKey: ['my-balances'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="My leaves"
        subtitle="Check balances, apply for leave, and track approval status"
        actions={
          <button
            type="button"
            className="btn btn-primary cursor-pointer"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={16} />
            {showForm ? 'Close form' : 'Apply for leave'}
          </button>
        }
      />

      <div className="hero-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Overview</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {stats.totalRemaining} days available
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {stats.pending} pending request{stats.pending === 1 ? '' : 's'}
              {stats.daysPending ? ` · ${stats.daysPending} days awaiting approval` : ''}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="Available" value={stats.totalRemaining} tone="ok" />
            <StatPill label="Pending" value={stats.pending} tone="warn" />
            <StatPill label="Approved" value={stats.approved} tone="brand" />
            <StatPill label="Requests" value={stats.total} tone="neutral" />
          </div>
        </div>
      </div>

      {enrichedBalances.length > 0 ? (
        <section>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Leave balances
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {enrichedBalances.map((b) => (
              <BalanceCard key={b._id} balance={b} />
            ))}
          </div>
        </section>
      ) : null}

      {showForm ? (
        <SectionCard title="New leave request" subtitle="Fill in dates and reason — manager will review">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyMutation.mutate();
            }}
          >
            <FormField label="Leave type">
              <select
                className="select cursor-pointer"
                required
                value={form.leaveTypeId}
                onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
              >
                <option value="">Select type</option>
                {types.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Supporting documents" hint="Optional — medical certificate, etc.">
              <input
                className="input cursor-pointer"
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => setFiles([...(e.target.files || [])])}
              />
              {files.length > 0 ? (
                <p className="mt-1 text-xs text-slate-500">{files.length} file(s) selected</p>
              ) : null}
            </FormField>

            <FormField label="From date">
              <input
                className="input cursor-pointer"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </FormField>

            <FormField label="To date">
              <input
                className="input cursor-pointer"
                type="date"
                required
                min={form.startDate || undefined}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </FormField>

            <FormField label="Reason" className="md:col-span-2">
              <textarea
                className="textarea min-h-[100px]"
                required
                placeholder="Explain why you need leave…"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </FormField>

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button
                className="btn btn-primary cursor-pointer"
                type="submit"
                disabled={applyMutation.isPending}
              >
                <Upload size={16} />
                {applyMutation.isPending ? 'Submitting…' : 'Submit request'}
              </button>
              <button
                className="btn btn-secondary cursor-pointer"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title="My requests" subtitle={`${filtered.length} request(s) shown`}>
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
          <p className="py-10 text-center text-sm text-slate-500">Loading requests…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No leave requests"
            hint={
              statusFilter
                ? 'Try another filter or apply for new leave.'
                : 'Click “Apply for leave” to submit your first request.'
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((leave) => (
              <LeaveRequestCard
                key={leave._id}
                leave={leave}
                cancelling={cancelMutation.isPending}
                onCancel={(id) => cancelMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
