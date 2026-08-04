import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Umbrella,
  Ticket,
  Users,
  Building2,
  Settings,
  LogOut,
  FileText,
  Menu,
  X,
  Eye,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import toast from 'react-hot-toast';

function linkClass({ isActive }) {
  return `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-100'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`;
}

export default function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isAdminLike = useAuthStore((s) => s.isAdminLike());
  const isManagerPlus = useAuthStore((s) => s.isManagerPlus());
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  const nav = [{ to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true }];

  if (!isAdminLike) {
    nav.push(
      { to: '/app/work', label: 'My Daily Work', icon: ClipboardList },
      { to: '/app/attendance', label: 'Attendance', icon: CalendarDays },
      { to: '/app/leaves', label: 'Leaves', icon: Umbrella }
    );
  }

  nav.push({ to: '/app/tickets', label: 'Tickets', icon: Ticket });

  if (isManagerPlus) {
    nav.push(
      {
        to: '/app/team/worklogs',
        label: isAdminLike ? 'Employee Work' : 'Team Work',
        icon: Eye,
      },
      { to: '/app/team/attendance', label: 'Team Attendance', icon: Users },
      { to: '/app/team/leaves', label: 'Leave Approvals', icon: FileText }
    );
  }

  if (isAdminLike) {
    nav.push(
      { to: '/app/admin/employees', label: 'Employees', icon: Users },
      { to: '/app/admin/departments', label: 'Departments', icon: Building2 },
      { to: '/app/admin/settings', label: 'Settings', icon: Settings }
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] lg:grid lg:grid-cols-[268px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[268px] transform flex-col border-r border-slate-200/80 bg-white shadow-[var(--shadow-lg)] transition lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <div>
            <p className="font-display text-2xl text-slate-900">WorkPulse</p>
            <p className="text-xs text-slate-500">Work & attendance</p>
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(false)}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="truncate text-sm font-semibold text-slate-900">{user?.name}</p>
            <p className="mt-0.5 truncate text-xs capitalize text-slate-500">
              {user?.role?.replaceAll('_', ' ')} · {user?.employeeId}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      ) : null}

      <div className="shell-main min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary px-2">
            <Menu size={18} />
          </button>
          <p className="font-display text-lg text-slate-900">WorkPulse</p>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
