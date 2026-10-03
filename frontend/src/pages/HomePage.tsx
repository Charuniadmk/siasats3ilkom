import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/use-auth';
import SetupPage from './SetupPage';

export default function HomePage() {
  const session = useAuth();
  return session.data?.role === 'ADMIN' ? <Navigate to="/dashboard" replace /> : <SetupPage />;
}
