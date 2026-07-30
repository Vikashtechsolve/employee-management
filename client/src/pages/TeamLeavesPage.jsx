import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, PageHeader } from '../components/ui';

export default function TeamLeavesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['team-leaves'],
    queryFn: async () =>
      (await api.get('/leaves', { params: { status: 'pending' } })).data.data,
  });

  const review = useMutation({
    mutationFn: ({ id, decision }) =>
      api.post(`/leaves/${id}/review`, { decision }),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['team-leaves'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div>
      <PageHeader title="Leave approvals" subtitle="Pending requests for your team" />
      {!(data || []).length ? (
        <EmptyState title="No pending leaves" />
      ) : (
        <div className="space-y-3">
          {data.map((l) => (
            <div key={l._id} className="card-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {l.employee?.name} · {l.leaveType?.name}
                  </p>
                  <p className="text-sm text-stone-500">
                    {l.startDate} → {l.endDate} ({l.days} days)
                  </p>
                  <p className="mt-2 text-sm">{l.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge value={l.status} />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => review.mutate({ id: l._id, decision: 'approved' })}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => review.mutate({ id: l._id, decision: 'rejected' })}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
