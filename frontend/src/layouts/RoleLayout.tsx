import { useAuth } from '../features/auth/use-auth';
import AdminLayout from './AdminLayout';
import StudentLayout from './StudentLayout';

export default function RoleLayout() {
  const session = useAuth();
  return session.data?.role === 'STUDENT' ? <StudentLayout /> : <AdminLayout />;
}
