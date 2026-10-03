import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/use-auth';

export default function HomePage() {
  const session = useAuth();
  return session.data?.role === 'ADMIN' ? <Navigate to="/dashboard" replace /> : <Navigate to="/dashboard" replace />;
}
