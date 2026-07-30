import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, PageHeader } from '../components/ui';

const empty = {
  employeeId: '',
  name: '',
  email: '',
  password: 'Employee@123',
  role: 'employee',
  department: '',
  designation: '',
  manager: '',
  cutoffTime: '11:00',
};

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(empty);
  const [show, setShow] = useState(false);

  const { data } = useQuery({
    queryKey: ['employees', search],
    queryFn: async () =>
      (await api.get('/users', { params: { search, limit: 100 } })).data.data,
  });
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data.data,
  });
  const { data: managers } = useQuery({
    queryKey: ['managers'],
    queryFn: async () =>
      (await api.get('/users', { params: { role: 'manager', limit: 50 } })).data.data,
  });

  const create = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      toast.success('Employee created');
      setForm(empty);
      setShow(false);
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Directory and account management"
        actions={
          <>
            <input
              className="input w-52"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="button" className="btn btn-primary" onClick={() => setShow(true)}>
              Add employee
            </button>
          </>
        }
      />

      {show ? (
        <form
          className="card-surface mb-4 grid gap-3 p-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          {['employeeId', 'name', 'email', 'password', 'designation', 'cutoffTime'].map((key) => (
            <label key={key} className="text-sm font-medium capitalize">
              {key}
              <input
                className="input mt-1"
                required={['employeeId', 'name', 'email', 'password'].includes(key)}
                type={key === 'password' ? 'password' : 'text'}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="text-sm font-medium">
            Role
            <select
              className="select mt-1"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {['employee', 'manager', 'hr', 'admin'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Department
            <select
              className="select mt-1"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            >
              <option value="">None</option>
              {(departments || []).map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Manager
            <select
              className="select mt-1"
              value={form.manager}
              onChange={(e) => setForm({ ...form, manager: e.target.value })}
            >
              <option value="">None</option>
              {(managers || []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 md:col-span-2">
            <button className="btn btn-primary" type="submit">
              Create
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShow(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="card-surface table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data || []).map((u) => (
              <tr key={u.id}>
                <td>{u.employeeId}</td>
                <td>
                  {u.name}
                  <div className="text-xs text-stone-500">{u.email}</div>
                </td>
                <td>
                  <Badge value={u.role} />
                </td>
                <td>{u.department?.name || '—'}</td>
                <td>{u.isActive ? 'Active' : 'Inactive'}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      toggleActive.mutate({ id: u.id, isActive: !u.isActive })
                    }
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
