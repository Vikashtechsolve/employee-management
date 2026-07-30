import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, PageHeader } from '../components/ui';

export default function LeavesPage() {
  const qc = useQueryClient();
  const { data: types } = useQuery({
    queryKey: ['leave-types'],
    queryFn: async () => (await api.get('/leaves/types')).data.data,
  });
  const { data: leaves } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: async () => (await api.get('/leaves/me')).data.data,
  });
  const { data: balances } = useQuery({
    queryKey: ['my-balances'],
    queryFn: async () => (await api.get('/users/me/leave-balances')).data.data,
  });

  const [form, setForm] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [files, setFiles] = useState([]);

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
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      qc.invalidateQueries({ queryKey: ['my-balances'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/leaves/${id}/cancel`),
    onSuccess: () => {
      toast.success('Cancelled');
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      qc.invalidateQueries({ queryKey: ['my-balances'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div>
      <PageHeader title="Leaves" subtitle="Apply and track leave requests" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(balances || []).map((b) => (
          <div key={b._id} className="card-surface p-4">
            <p className="text-xs uppercase text-stone-500">{b.leaveType?.name}</p>
            <p className="font-display text-2xl">{b.remaining}</p>
            <p className="text-xs text-stone-500">
              Used {b.used} · Pending {b.pending} · Allocated {b.allocated}
            </p>
          </div>
        ))}
      </div>

      <form
        className="card-surface grid gap-3 p-5 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          applyMutation.mutate();
        }}
      >
        <label className="text-sm font-medium">
          Leave type
          <select
            className="select mt-1"
            required
            value={form.leaveTypeId}
            onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
          >
            <option value="">Select</option>
            {(types || []).map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Supporting files
          <input
            className="input mt-1"
            type="file"
            multiple
            onChange={(e) => setFiles([...e.target.files])}
          />
        </label>
        <label className="text-sm font-medium">
          From
          <input
            className="input mt-1"
            type="date"
            required
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </label>
        <label className="text-sm font-medium">
          To
          <input
            className="input mt-1"
            type="date"
            required
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Reason
          <textarea
            className="textarea mt-1"
            required
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </label>
        <button className="btn btn-primary md:col-span-2" type="submit">
          Apply for leave
        </button>
      </form>

      <div className="card-surface mt-6 table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Type</th>
              <th>Dates</th>
              <th>Days</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(leaves || []).map((l) => (
              <tr key={l._id}>
                <td>{l.leaveType?.name}</td>
                <td>
                  {l.startDate} → {l.endDate}
                </td>
                <td>{l.days}</td>
                <td>
                  <Badge value={l.status} />
                </td>
                <td>
                  {l.status === 'pending' ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => cancelMutation.mutate(l._id)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
