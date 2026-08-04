import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  CalendarRange,
  CheckCircle2,
  Paperclip,
  Search,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, FormField, PageHeader, SectionCard, StatPill } from '../components/ui';

function LeaveRequestCard({ leave, onReview, reviewingId }) {
  const [note, setNote] = useState('');
  const [expanded, setExpanded] = useState(false);
  const busy = reviewingId === leave._id;

  return (
    <article className="card-surface overflow-hidden transition hover:shadow-[var(--shadow-md)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/30 px-5 py-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-base font-semibold text-white">
            {(leave.employee?.name || '?').slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{leave.employee?.name}</p>
            <p className="text-xs text-slate-500">
              {leave.employee?.employeeId} · {leave.employee?.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                <CalendarRange size={13} className="text-teal-600" />
                {format(parseISO(leave.startDate), 'dd MMM')} –{' '}
                {format(parseISO(leave.endDate), 'dd MMM yyyy')}
              </span>
              <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                {leave.days} day{leave.days === 1 ? '' : 's'}
              </span>
              <Badge value={leave.leaveType?.code || leave.leaveType?.name} />
            </div>
          </div>
          <Badge value={leave.status} />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Leave type</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{leave.leaveType?.name}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{leave.reason}</p>
        </div>

        {(leave.attachments || []).length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Attachments
            </p>
            <ul className="mt-2 space-y-1.5">
              {leave.attachments.map((file) => (
                <li key={file.key}>
                  <a
                    href={file.url && !file.url.startsWith('local-dev://') ? file.url : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
                    onClick={async (e) => {
                      if (file.url && !file.url.startsWith('local-dev://')) return;
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

        {leave.reviewedAt ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Review</p>
            <p className="mt-1 text-slate-700">
              {leave.reviewedBy?.name ? `By ${leave.reviewedBy.name} · ` : ''}
              {format(new Date(leave.reviewedAt), 'dd MMM yyyy · HH:mm')}
            </p>
            {leave.reviewNote ? (
              <p className="mt-1 text-slate-600">{leave.reviewNote}</p>
            ) : null}
          </div>
        ) : null}

        {leave.status === 'pending' ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between text-left"
              onClick={() => setExpanded((v) => !v)}
            >
              <p className="text-sm font-semibold text-slate-900">Review request</p>
              <span className="text-xs text-slate-500">{expanded ? 'Hide' : 'Show'}</span>
            </button>
            {expanded ? (
              <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                <FormField label="Review note" hint="Optional note for the employee">
                  <textarea
                    className="textarea min-h-[72px] text-sm"
                    placeholder="Approved for family event…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary cursor-pointer"
                    disabled={busy}
                    onClick={() => onReview({ id: leave._id, decision: 'approved', reviewNote: note })}
                  >
                    <CheckCircle2 size={15} /> Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger cursor-pointer"
                    disabled={busy}
                    onClick={() => onReview({ id: leave._id, decision: 'rejected', reviewNote: note })}
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary cursor-pointer"
                  disabled={busy}
                  onClick={() => onReview({ id: leave._id, decision: 'approved' })}
                >
                  <CheckCircle2 size={15} /> Approve
                </button>
                <button
                  type="button"
                  className="btn btn-danger cursor-pointer"
                  disabled={busy}
                  onClick={() => onReview({ id: leave._id, decision: 'rejected' })}
                >
                  <XCircle size={15} /> Reject
                </button>
              </div>
            )}
          </div>
        ) : null}

        <p className="text-xs text-slate-400">
          Requested {format(new Date(leave.createdAt), 'dd MMM yyyy · HH:mm')}
        </p>
      </div>
    </article>
  );
}

const STATUS_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: '', label: 'All' },
];

export default function TeamLeavesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [reviewingId, setReviewingId] = useState(null);

  const { data: allLeaves = [], isLoading } = useQuery({
    queryKey: ['team-leaves'],
    queryFn: async () => (await api.get('/leaves', { params: { limit: 200 } })).data.data,
  });

  const stats = useMemo(() => {
    const pending = allLeaves.filter((l) => l.status === 'pending').length;
    const approved = allLeaves.filter((l) => l.status === 'approved').length;
    const rejected = allLeaves.filter((l) => l.status === 'rejected').length;
    const daysPending = allLeaves
      .filter((l) => l.status === 'pending')
      .reduce((sum, l) => sum + (l.days || 0), 0);
    return { pending, approved, rejected, daysPending, total: allLeaves.length };
  }, [allLeaves]);

  const filtered = useMemo(() => {
    let list = allLeaves;
    if (statusFilter) list = list.filter((l) => l.status === statusFilter);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (l) =>
        l.employee?.name?.toLowerCase().includes(q) ||
        l.employee?.employeeId?.toLowerCase().includes(q) ||
        l.leaveType?.name?.toLowerCase().includes(q)
    );
  }, [allLeaves, statusFilter, search]);

  const review = useMutation({
    mutationFn: ({ id, decision, reviewNote }) =>
      api.post(`/leaves/${id}/review`, { decision, reviewNote: reviewNote || undefined }),
    onMutate: ({ id }) => setReviewingId(id),
    onSuccess: (_, { decision }) => {
      toast.success(decision === 'approved' ? 'Leave approved' : 'Leave rejected');
      qc.invalidateQueries({ queryKey: ['team-leaves'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    onSettled: () => setReviewingId(null),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leave Approvals"
        subtitle="Review and action pending leave requests from your team"
      />

      <div className="hero-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Overview</p>
            <h2 className="mt-1 font-display text-2xl text-slate-900">
              {stats.pending} pending request{stats.pending === 1 ? '' : 's'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {stats.daysPending} total day{stats.daysPending === 1 ? '' : 's'} awaiting decision
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="Pending" value={stats.pending} tone="warn" />
            <StatPill label="Approved" value={stats.approved} tone="ok" />
            <StatPill label="Rejected" value={stats.rejected} tone="danger" />
            <StatPill label="Showing" value={filtered.length} tone="brand" />
          </div>
        </div>
      </div>

      <SectionCard
        title="Requests"
        subtitle="Filter by status or search by employee"
        actions={
          <div className="relative min-w-[200px]">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="input input-icon-left cursor-text text-sm"
              placeholder="Search employee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
          <p className="py-10 text-center text-sm text-slate-500">Loading requests…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={statusFilter === 'pending' ? 'No pending leaves' : 'No requests found'}
            hint={
              statusFilter === 'pending'
                ? 'New leave applications will appear here for your review.'
                : 'Try another filter or clear your search.'
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((leave) => (
              <LeaveRequestCard
                key={leave._id}
                leave={leave}
                reviewingId={reviewingId}
                onReview={(payload) => review.mutate(payload)}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
