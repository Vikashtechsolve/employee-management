import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Building2,
  CalendarDays,
  Cloud,
  Clock3,
  HardDrive,
  Plus,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { FormField, PageHeader, SectionCard, StatPill } from '../components/ui';

const FIELD_META = {
  companyName: {
    label: 'Company name',
    hint: 'Shown across the app and reports',
    placeholder: 'Vikash Tech Solution',
  },
  timezone: {
    label: 'Timezone',
    hint: 'Used for attendance cutoff and dates',
    placeholder: 'Asia/Kolkata',
  },
  defaultCutoff: {
    label: 'Default work cutoff',
    hint: 'Time by which daily work should be submitted (HH:mm)',
    placeholder: '11:00',
  },
  maxAttachmentSizeMb: {
    label: 'Max attachment size (MB)',
    hint: 'Maximum upload size per file',
    placeholder: '5',
    type: 'number',
  },
};

export default function SettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [holiday, setHoliday] = useState({ name: '', date: '' });
  const holidayYear = new Date().getFullYear();

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data,
  });

  const { data: holidays = [], isLoading: loadingHolidays } = useQuery({
    queryKey: ['holidays', holidayYear],
    queryFn: async () =>
      (await api.get('/holidays', { params: { year: holidayYear } })).data.data,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName || '',
        timezone: settings.timezone || '',
        defaultCutoff: settings.defaultCutoff || '',
        maxAttachmentSizeMb: settings.maxAttachmentSizeMb ?? 5,
      });
    }
  }, [settings]);

  const save = useMutation({
    mutationFn: () => api.patch('/settings', form),
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const addHoliday = useMutation({
    mutationFn: () => api.post('/holidays', holiday),
    onSuccess: () => {
      toast.success('Holiday added');
      setHoliday({ name: '', date: '' });
      qc.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const deleteHoliday = useMutation({
    mutationFn: (id) => api.delete(`/holidays/${id}`),
    onSuccess: () => {
      toast.success('Holiday removed');
      qc.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const upcomingHolidays = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return holidays.filter((h) => h.date >= today).slice(0, 5);
  }, [holidays]);

  if (loadingSettings || !form) {
    return (
      <div className="py-16 text-center text-sm text-slate-500">Loading settings…</div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        subtitle="Company profile, work rules, storage, and holiday calendar"
      />

      <div className="hero-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
              {form.companyName || 'Company'}
            </p>
            <h2 className="mt-1 font-display text-2xl text-slate-900">Admin configuration</h2>
            <p className="mt-1 text-sm text-slate-600">
              Timezone {form.timezone} · Cutoff {form.defaultCutoff}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatPill
              label="File storage"
              value={settings?.r2Configured ? 'R2 live' : 'Local dev'}
              tone={settings?.r2Configured ? 'ok' : 'warn'}
            />
            <StatPill label="Holidays" value={holidays.length} tone="brand" />
            <StatPill label="Max upload" value={`${form.maxAttachmentSizeMb} MB`} tone="neutral" />
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard
          title="Company profile"
          subtitle="Basic identity and regional settings"
        >
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            {Object.entries(FIELD_META).map(([key, meta]) => (
              <FormField key={key} label={meta.label} hint={meta.hint}>
                <input
                  className="input"
                  type={meta.type || 'text'}
                  placeholder={meta.placeholder}
                  value={form[key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [key]: meta.type === 'number' ? Number(e.target.value) : e.target.value,
                    })
                  }
                />
              </FormField>
            ))}
            <button
              className="btn btn-primary cursor-pointer"
              type="submit"
              disabled={save.isPending}
            >
              {save.isPending ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="System status"
          subtitle="Infrastructure and operational defaults"
        >
          <ul className="space-y-3">
            <li className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <Cloud size={18} className="mt-0.5 shrink-0 text-teal-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Cloudflare R2 storage</p>
                <p className="mt-1 text-sm text-slate-600">
                  {settings?.r2Configured
                    ? 'Production file uploads are stored in R2.'
                    : 'R2 is not configured — uploads use local dev fallback.'}
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <Clock3 size={18} className="mt-0.5 shrink-0 text-teal-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Attendance cutoff</p>
                <p className="mt-1 text-sm text-slate-600">
                  Employees marked Present if work is submitted before{' '}
                  <strong>{form.defaultCutoff}</strong> ({form.timezone}).
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <HardDrive size={18} className="mt-0.5 shrink-0 text-teal-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Upload limits</p>
                <p className="mt-1 text-sm text-slate-600">
                  Proof files and attachments up to {form.maxAttachmentSizeMb} MB each.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <Building2 size={18} className="mt-0.5 shrink-0 text-teal-600" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Work week</p>
                <p className="mt-1 text-sm text-slate-600">
                  Monday – Friday working days (weekends excluded from absence rules).
                </p>
              </div>
            </li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Holiday calendar"
        subtitle={`${holidayYear} company holidays · ${holidays.length} total`}
        actions={
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarDays size={15} />
            {upcomingHolidays.length} upcoming
          </span>
        }
      >
        <form
          className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[1fr_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            addHoliday.mutate();
          }}
        >
          <FormField label="Holiday name" className="sm:col-span-1">
            <input
              className="input"
              placeholder="Diwali"
              required
              value={holiday.name}
              onChange={(e) => setHoliday({ ...holiday, name: e.target.value })}
            />
          </FormField>
          <FormField label="Date">
            <input
              className="input cursor-pointer"
              type="date"
              required
              value={holiday.date}
              onChange={(e) => setHoliday({ ...holiday, date: e.target.value })}
            />
          </FormField>
          <div className="flex items-end">
            <button
              className="btn btn-primary w-full cursor-pointer sm:w-auto"
              type="submit"
              disabled={addHoliday.isPending}
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </form>

        {loadingHolidays ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading holidays…</p>
        ) : holidays.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
            No holidays added for {holidayYear} yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {holidays.map((h) => {
              const isPast = h.date < format(new Date(), 'yyyy-MM-dd');
              return (
                <li
                  key={h._id}
                  className={`flex items-center justify-between gap-3 px-4 py-3 ${
                    isPast ? 'bg-slate-50/50' : 'bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{h.name}</p>
                    <p className="text-sm text-slate-500">
                      {format(parseISO(h.date), 'EEEE, dd MMM yyyy')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary cursor-pointer px-2.5 py-2 text-rose-600 hover:bg-rose-50"
                    disabled={deleteHoliday.isPending}
                    onClick={() => deleteHoliday.mutate(h._id)}
                    aria-label={`Remove ${h.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
