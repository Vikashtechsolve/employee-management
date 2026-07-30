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
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
    isActive ? 'bg-teal-800/60 text-white' : 'text-teal-100/80 hover:bg-teal-900/50 hover:text-white'
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

  const nav = [
    { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/app/work', label: 'My Daily Work', icon: ClipboardList },
    { to: '/app/attendance', label: 'Attendance', icon: CalendarDays },
    { to: '/app/leaves', label: 'Leaves', icon: Umbrella },
    { to: '/app/tickets', label: 'Tickets', icon: Ticket },
  ];

  if (isManagerPlus) {
    nav.splice(2, 0, {
      to: '/app/team/worklogs',
      label: isAdminLike ? 'Employee Work' : 'Team Work',
      icon: Eye,
    });
    nav.push(
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
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] transform bg-[var(--sidebar)] p-4 text-[var(--sidebar-text)] transition lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="font-display text-2xl text-white">WorkPulse</p>
            <p className="text-xs text-teal-200/70">Attendance + Work EMS</p>
          </div>
          <button className="lg:hidden" onClick={() => setOpen(false)} type="button">
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-8 border-t border-teal-800 pt-4">
          <p className="text-sm font-semibold text-white">{user?.name}</p>
          <p className="text-xs capitalize text-teal-200/70">
            {user?.role?.replaceAll('_', ' ')} · {user?.employeeId}
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 flex items-center gap-2 text-sm text-teal-100/80 hover:text-white"
          >
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        />
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_88%,white)] px-4 py-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary px-2">
            <Menu size={18} />
          </button>
          <p className="font-display text-lg">WorkPulse</p>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
