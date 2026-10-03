import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { useAuth } from './use-auth';
import type { Role } from './types';

export default function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const session = useAuth();

  if (session.isPending) {
    return <main className="flex min-h-screen items-center justify-center text-secondary" role="status">Memuat sesi...</main>;
  }
  if (session.isError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p role="alert">Tidak dapat memeriksa sesi. Silakan coba kembali.</p>
        <Button onClick={() => { void session.refetch(); }}>Coba kembali</Button>
      </main>
    );
  }
  if (!session.data) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(session.data.role)) {
    return <main className="flex min-h-screen items-center justify-center px-6">Anda tidak memiliki izin untuk mengakses halaman ini.</main>;
  }
  return children;
}
