import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { EmptyState, FormField, PageHeader, SectionCard, StatPill } from '../components/ui';

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data.data,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-depts'],
    queryFn: async () => (await api.get('/users', { params: { limit: 200 } })).data.data,
  });

  const headcountByDept = useMemo(() => {
    const map = {};
    for (const u of employees) {
      const id = String(u.department?._id || u.department || '');
      if (id) map[id] = (map[id] || 0) + 1;
    }
    return map;
  }, [employees]);

  const create = useMutation({
    mutationFn: () => api.post('/departments', form),
    onSuccess: () => {
      toast.success('Department created');
      setForm({ name: '', code: '', description: '' });
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const totalMembers = useMemo(
    () => Object.values(headcountByDept).reduce((a, b) => a + b, 0),
    [headcountByDept]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Departments"
        subtitle="Organize your company structure and team groupings"
        actions={
          <button
            type="button"
            className="btn btn-primary cursor-pointer"
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={16} />
            {showForm ? 'Close' : 'Add department'}
          </button>
        }
      />

      <div className="hero-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              Organization
            </p>
            <h2 className="mt-1 font-display text-2xl text-slate-900">
              {departments.length} department{departments.length === 1 ? '' : 's'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {totalMembers} employees assigned across departments
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Departments" value={departments.length} tone="brand" />
            <StatPill label="Assigned staff" value={totalMembers} tone="ok" />
          </div>
        </div>
      </div>

      {showForm ? (
        <SectionCard title="New department" subtitle="Add a team or business unit">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <FormField label="Department name">
              <input
                className="input"
                required
                placeholder="Engineering"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Code" hint="Short unique code (e.g. ENG)">
              <input
                className="input uppercase"
                required
                placeholder="ENG"
                maxLength={8}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </FormField>
            <FormField label="Description" className="md:col-span-2">
              <textarea
                className="textarea min-h-[88px]"
                placeholder="What this department does…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </FormField>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button className="btn btn-primary cursor-pointer" type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create department'}
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

      {isLoading ? (
        <p className="py-10 text-center text-sm text-slate-500">Loading departments…</p>
      ) : departments.length === 0 ? (
        <EmptyState
          title="No departments yet"
          hint="Create your first department to organize employees."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => {
            const count = headcountByDept[d._id] || 0;
            return (
              <article
                key={d._id}
                className="card-surface card-surface-hover overflow-hidden p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <Building2 size={20} />
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold tracking-wide text-slate-700">
                    {d.code}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl text-slate-900">{d.name}</h3>
                <p className="mt-2 min-h-[40px] text-sm leading-relaxed text-slate-600">
                  {d.description || 'No description provided.'}
                </p>
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                  <Users size={15} className="text-teal-600" />
                  <span className="font-medium">{count}</span>
                  <span>member{count === 1 ? '' : 's'}</span>
                  {d.head?.name ? (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="truncate text-xs">Head: {d.head.name}</span>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
