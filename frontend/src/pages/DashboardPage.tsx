import AdminHomePage from './AdminHomePage';
import StudentDashboardPage from './StudentDashboardPage';
import { useAuth } from '../features/auth/use-auth';
export default function DashboardPage() {
  const session = useAuth();
  return session.data?.role === 'ADMIN' ? <AdminHomePage /> : <StudentDashboardPage />;
}
