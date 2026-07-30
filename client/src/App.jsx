import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import AppLayout from './layouts/AppLayout';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import WorkPage from './pages/WorkPage';
import AttendancePage from './pages/AttendancePage';
import LeavesPage from './pages/LeavesPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import TeamAttendancePage from './pages/TeamAttendancePage';
import TeamLeavesPage from './pages/TeamLeavesPage';
import TeamWorklogsPage from './pages/TeamWorklogsPage';
import EmployeesPage from './pages/EmployeesPage';
import DepartmentsPage from './pages/DepartmentsPage';
import SettingsPage from './pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="work" element={<WorkPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="leaves" element={<LeavesPage />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="tickets/:id" element={<TicketDetailPage />} />
              <Route
                element={<RoleRoute roles={['super_admin', 'admin', 'hr', 'manager']} />}
              >
                <Route path="team/attendance" element={<TeamAttendancePage />} />
                <Route path="team/leaves" element={<TeamLeavesPage />} />
                <Route path="team/worklogs" element={<TeamWorklogsPage />} />
              </Route>
              <Route element={<RoleRoute roles={['super_admin', 'admin', 'hr']} />}>
                <Route path="admin/employees" element={<EmployeesPage />} />
                <Route path="admin/departments" element={<DepartmentsPage />} />
                <Route path="admin/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
