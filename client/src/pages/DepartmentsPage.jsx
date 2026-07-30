import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { PageHeader } from '../components/ui';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data.data,
  });
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const create = useMutation({
    mutationFn: () => api.post('/departments', form),
    onSuccess: () => {
      toast.success('Department created');
      setForm({ name: '', code: '', description: '' });
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div>
      <PageHeader title="Departments" />
      <form
        className="card-surface mb-4 grid gap-3 p-5 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <input
          className="input"
          placeholder="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="input"
          placeholder="Code"
          required
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <button className="btn btn-primary" type="submit">
          Add
        </button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data || []).map((d) => (
          <div key={d._id} className="card-surface p-4">
            <p className="font-display text-xl">{d.name}</p>
            <p className="text-sm text-stone-500">{d.code}</p>
            <p className="mt-2 text-sm">{d.description || '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
