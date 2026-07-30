import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, PageHeader } from '../components/ui';

export default function TeamAttendancePage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['team-attendance', date],
    queryFn: async () =>
      (await api.get('/attendance', { params: { date, limit: 100 } })).data.data,
  });

  const [override, setOverride] = useState({
    employeeId: '',
    status: 'present',
    reason: '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/attendance/override', { ...override, date }),
    onSuccess: () => {
      toast.success('Attendance updated');
      setOverride({ employeeId: '', status: 'present', reason: '' });
      qc.invalidateQueries({ queryKey: ['team-attendance', date] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div>
      <PageHeader
        title="Team attendance"
        actions={
          <input
            className="input w-auto"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        }
      />

      <form
        className="card-surface mb-4 grid gap-3 p-4 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <select
          className="select"
          required
          value={override.employeeId}
          onChange={(e) => setOverride({ ...override, employeeId: e.target.value })}
        >
          <option value="">Employee</option>
          {(data || []).map((r) => (
            <option key={r._id} value={r.employee?._id || r.employee}>
              {r.employee?.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={override.status}
          onChange={(e) => setOverride({ ...override, status: e.target.value })}
        >
          {['present', 'late', 'absent', 'half_day', 'on_leave'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Override reason"
          required
          value={override.reason}
          onChange={(e) => setOverride({ ...override, reason: e.target.value })}
        />
        <button className="btn btn-primary" type="submit">
          Override
        </button>
      </form>

      <div className="card-surface table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Status</th>
              <th>Source</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((row) => (
              <tr key={row._id}>
                <td>
                  {row.employee?.name}
                  <div className="text-xs text-stone-500">{row.employee?.employeeId}</div>
                </td>
                <td>
                  <Badge value={row.status} />
                </td>
                <td>{row.source}</td>
                <td>{row.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
