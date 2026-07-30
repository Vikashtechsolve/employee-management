import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { PageHeader } from '../components/ui';

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data,
  });
  const { data: holidays, refetch } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => (await api.get('/holidays')).data.data,
  });

  const [form, setForm] = useState(null);
  const [holiday, setHoliday] = useState({ name: '', date: '' });

  useEffect(() => {
    if (settings) {
      setForm({
        companyName: settings.companyName,
        timezone: settings.timezone,
        defaultCutoff: settings.defaultCutoff,
        maxAttachmentSizeMb: settings.maxAttachmentSizeMb,
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
      refetch();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (!form) return <p>Loading…</p>;

  return (
    <div>
      <PageHeader
        title="Company settings"
        subtitle={settings?.r2Configured ? 'R2 storage connected' : 'R2 not configured (dev fallback)'}
      />

      <form
        className="card-surface grid gap-3 p-5 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {Object.keys(form).map((key) => (
          <label key={key} className="text-sm font-medium capitalize">
            {key.replace(/([A-Z])/g, ' $1')}
            <input
              className="input mt-1"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        <button className="btn btn-primary md:col-span-2" type="submit">
          Save settings
        </button>
      </form>

      <h3 className="font-display mt-8 text-xl">Holiday calendar</h3>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addHoliday.mutate();
        }}
      >
        <input
          className="input w-48"
          placeholder="Name"
          required
          value={holiday.name}
          onChange={(e) => setHoliday({ ...holiday, name: e.target.value })}
        />
        <input
          className="input w-auto"
          type="date"
          required
          value={holiday.date}
          onChange={(e) => setHoliday({ ...holiday, date: e.target.value })}
        />
        <button className="btn btn-secondary" type="submit">
          Add holiday
        </button>
      </form>
      <ul className="mt-4 space-y-2">
        {(holidays || []).map((h) => (
          <li key={h._id} className="card-surface flex justify-between px-4 py-3 text-sm">
            <span>{h.name}</span>
            <span className="text-stone-500">{h.date}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
