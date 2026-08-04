import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Search, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { Badge, EmptyState, FormField, PageHeader, SectionCard, StatPill } from '../components/ui';

const empty = {
  employeeId: '',
  name: '',
  email: '',
  password: '',
  role: 'employee',
  department: '',
  designation: '',
  manager: '',
  cutoffTime: '11:00',
};

const ROLE_LABELS = {
  employee: 'Employee',
  manager: 'Manager',
  hr: 'HR',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', search],
    queryFn: async () =>
      (await api.get('/users', { params: { search, limit: 200 } })).data.data,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => (await api.get('/departments')).data.data,
  });

  const { data: managers = [] } = useQuery({
    queryKey: ['managers'],
    queryFn: async () =>
      (await api.get('/users', { params: { role: 'manager', limit: 50 } })).data.data,
  });

  const filtered = useMemo(() => {
    let list = employees;
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, roleFilter]);

  const stats = useMemo(() => {
    const active = employees.filter((u) => u.isActive).length;
    const inactive = employees.length - active;
    const byRole = employees.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1;
      return acc;
    }, {});
    return { total: employees.length, active, inactive, byRole };
  }, [employees]);

  const create = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      toast.success('Employee created');
      setForm(empty);
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/users/${id}`, { isActive }),
    onSuccess: () => {
      toast.success('Employee updated');
      qc.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employees"
        subtitle="Manage team directory, roles, and account access"
        actions={
          <button
            type="button"
            className="btn btn-primary cursor-pointer"
            onClick={() => setShowForm((v) => !v)}
          >
            <UserPlus size={16} />
            {showForm ? 'Close form' : 'Add employee'}
          </button>
        }
      />

      <div className="hero-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Directory</p>
            <h2 className="mt-1 font-display text-2xl text-slate-900">
              {stats.total} team member{stats.total === 1 ? '' : 's'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {stats.active} active · {stats.inactive} inactive
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatPill label="Active" value={stats.active} tone="ok" />
            <StatPill label="Inactive" value={stats.inactive} tone="neutral" />
            <StatPill label="Managers" value={stats.byRole.manager || 0} tone="brand" />
            <StatPill label="Employees" value={stats.byRole.employee || 0} tone="sky" />
          </div>
        </div>
      </div>

      {showForm ? (
        <SectionCard title="New employee" subtitle="Create an account and assign role & department">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <FormField label="Employee ID" hint="Unique company ID">
              <input
                className="input"
                required
                placeholder="EMP-001"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
              />
            </FormField>
            <FormField label="Full name">
              <input
                className="input"
                required
                placeholder="Jane Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <FormField label="Email">
              <input
                className="input"
                type="email"
                required
                placeholder="jane@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </FormField>
            <FormField label="Temporary password" hint="Share securely; employee can change later">
              <input
                className="input"
                type="password"
                required
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </FormField>
            <FormField label="Designation">
              <input
                className="input"
                placeholder="Software Engineer"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </FormField>
            <FormField label="Work cutoff time" hint="Daily work submission deadline">
              <input
                className="input"
                placeholder="11:00"
                value={form.cutoffTime}
                onChange={(e) => setForm({ ...form, cutoffTime: e.target.value })}
              />
            </FormField>
            <FormField label="Role">
              <select
                className="select cursor-pointer"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                {['employee', 'manager', 'hr', 'admin'].map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Department">
              <select
                className="select cursor-pointer"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Reporting manager" className="md:col-span-2">
              <select
                className="select cursor-pointer"
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
              >
                <option value="">None</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <button className="btn btn-primary cursor-pointer" type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create employee'}
              </button>
              <button
                className="btn btn-secondary cursor-pointer"
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(empty);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Team directory"
        subtitle={`${filtered.length} people shown`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px]">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="input input-icon-left cursor-text text-sm"
                placeholder="Search name, ID, email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="select w-auto cursor-pointer text-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {isLoading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading employees…</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="No employees found" hint="Try a different search or add a new employee." />
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {filtered.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center gap-4 px-4 py-4 transition hover:bg-slate-50/80"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${
                    u.isActive ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {(u.name || '?').slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{u.name}</p>
                    <Badge value={u.role} />
                    {!u.isActive ? (
                      <span className="badge bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">{u.employeeId}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                    <Mail size={13} className="text-slate-400" />
                    {u.email}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {u.department?.name || 'No department'}
                    {u.designation ? ` · ${u.designation}` : ''}
                    {u.cutoffTime ? ` · Cutoff ${u.cutoffTime}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className={`btn cursor-pointer text-sm ${
                    u.isActive ? 'btn-secondary' : 'btn-primary'
                  }`}
                  disabled={toggleActive.isPending}
                  onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
