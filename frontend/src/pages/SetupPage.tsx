import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, LogOut } from 'lucide-react';
import Button from '../components/ui/Button';
import { authErrorMessage, logout } from '../features/auth/auth-api';
import { sessionQueryKey, useAuth } from '../features/auth/use-auth';

export default function SetupPage() {
  const session = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(sessionQueryKey, null);
      navigate('/login', { replace: true });
    },
  });
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-xl rounded-xl border border-border bg-background p-8 shadow-sm">
        <CheckCircle2 className="mb-6 text-success" size={28} aria-hidden="true" />
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Sistem Akademik Mahasiswa Doktor
        </h1>
        <p className="mt-3 text-base text-secondary">Anda berhasil masuk sebagai {session.data?.role === 'ADMIN' ? 'Admin' : 'Mahasiswa'}.</p>
        <p className="mt-2 text-sm text-secondary">Akun: {session.data?.username ?? session.data?.nim}</p>
        <p className="mt-4 text-sm text-secondary">Halaman utama sedang disiapkan.</p>
        {mutation.isError && <p role="alert" className="mt-4 text-sm text-error">{authErrorMessage(mutation.error)}</p>}
        <Button className="mt-6" disabled={mutation.isPending} onClick={() => mutation.mutate()}><LogOut size={16} aria-hidden="true" />{mutation.isPending ? 'Memproses...' : 'Keluar'}</Button>
      </section>
    </main>
  );
}
