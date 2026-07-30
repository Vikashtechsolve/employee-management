import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.accessToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/app" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setSession(data.data);
      toast.success(`Welcome, ${data.data.user.name}`);
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#0f1c1a] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#134e4a,transparent_45%),radial-gradient(circle_at_80%_10%,#9a3412,transparent_35%)]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-teal-50">
          <p className="font-display text-4xl">WorkPulse</p>
          <div>
            <h1 className="font-display max-w-md text-5xl leading-tight">
              Work submitted. Attendance earned.
            </h1>
            <p className="mt-4 max-w-sm text-teal-100/80">
              Daily proof of work, leave approvals, tickets, and org-wide visibility in one place.
            </p>
          </div>
          <p className="text-sm text-teal-200/60">Employee Attendance & Work Management</p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <form onSubmit={onSubmit} className="card-surface w-full max-w-md p-8 shadow-sm">
          <p className="font-display text-3xl text-stone-900 lg:hidden">WorkPulse</p>
          <h2 className="font-display mt-2 text-2xl text-stone-900">Sign in</h2>
          <p className="mt-1 text-sm text-stone-500">Use your company account</p>

          <label className="mt-6 block text-sm font-medium text-stone-700">
            Email
            <input
              className="input mt-1"
              type="email"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-stone-700">
            Password
            <div className="relative mt-1">
              <input
                className="input pr-11"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn-primary mt-6 w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </div>
  );
}
