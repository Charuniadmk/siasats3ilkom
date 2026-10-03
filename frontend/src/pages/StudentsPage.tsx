import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight, Search, UserPlus, Users } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/ui/Button';
import { authErrorMessage } from '../features/auth/auth-api';
import { useSessionExpiry } from '../features/auth/use-session-expiry';
import { listStudents, studentsQueryKey } from '../features/students/students-api';

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const location = useLocation();
  const state: unknown = location.state;
  const successMessage = typeof state === 'object' && state !== null && 'successMessage' in state && typeof state.successMessage === 'string' ? state.successMessage : null;
  const students = useQuery({
    queryKey: [...studentsQueryKey, page, search],
    queryFn: ({ signal }) => listStudents(page, search, signal),
    retry: false,
  });
  useSessionExpiry(students.error);
  const meta = students.data?.meta;

  return (
    <>
      <PageHeader title="Mahasiswa" description="Kelola akun mahasiswa untuk mengakses sistem akademik." action={<Link to="/students/new" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"><UserPlus size={17} aria-hidden="true" />Tambah Akun Mahasiswa</Link>} />
      {successMessage && <p role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={18} aria-hidden="true" />{successMessage}</p>}
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div><h2 className="text-base font-semibold">Daftar akun mahasiswa</h2><p className="mt-1 text-xs text-secondary">{meta ? `${meta.total} akun${search ? ' ditemukan' : ' terdaftar'}` : 'Akun mahasiswa program doktor'}</p></div>
          <form className="flex w-full gap-2 sm:w-auto" onSubmit={(event) => { event.preventDefault(); setSearch(searchDraft.trim()); setPage(1); }}>
            <div className="relative min-w-0 flex-1"><Search size={16} aria-hidden="true" className="pointer-events-none absolute top-3 left-3 text-secondary" /><input type="search" aria-label="Cari berdasarkan NIM" placeholder="Cari berdasarkan NIM..." value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={32} className="w-full rounded-lg border border-border py-2.5 pr-3 pl-9 text-sm sm:w-60" /></div>
            <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface">Cari</button>
          </form>
        </div>
        {students.isPending ? <p role="status" className="p-12 text-center text-sm text-secondary">Memuat data mahasiswa...</p>
          : students.isError ? <div className="flex flex-col items-center gap-4 p-10"><p role="alert" className="text-center text-sm text-error">{authErrorMessage(students.error)}</p><Button onClick={() => { void students.refetch(); }}>Coba kembali</Button></div>
          : !students.data?.data.length ? <div className="flex flex-col items-center px-6 py-14 text-center"><span className="mb-4 rounded-2xl bg-surface p-4 text-secondary"><Users size={27} aria-hidden="true" /></span><h3 className="text-sm font-semibold">{search ? 'Mahasiswa tidak ditemukan.' : 'Belum ada akun mahasiswa.'}</h3><p className="mt-2 text-sm text-secondary">{search ? 'Coba gunakan NIM atau kata pencarian lainnya.' : 'Tambahkan akun agar mahasiswa dapat masuk ke sistem.'}</p></div>
          : <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-surface text-xs font-medium text-secondary"><tr><th className="px-6 py-3.5 font-medium">NIM</th><th className="px-6 py-3.5 font-medium">Jenis akun</th><th className="px-6 py-3.5 font-medium">Tanggal dibuat</th></tr></thead><tbody className="divide-y divide-border">{students.data.data.map((student) => <tr key={student.id} className="hover:bg-surface/50"><td className="px-6 py-5 font-medium tabular-nums">{student.nim}</td><td className="px-6 py-5"><span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs text-accent">Mahasiswa</span></td><td className="px-6 py-5 text-secondary">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(student.createdAt))}</td></tr>)}</tbody></table></div>}
        {meta && meta.total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 text-xs text-secondary"><p>Halaman {meta.page} dari {Math.max(meta.totalPages, 1)}</p><div className="flex gap-2"><button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1 || students.isFetching} onClick={() => setPage(page - 1)} className="rounded-lg border border-border p-2 hover:bg-surface disabled:opacity-40"><ChevronLeft size={16} aria-hidden="true" /></button><button type="button" aria-label="Halaman selanjutnya" disabled={page >= meta.totalPages || students.isFetching} onClick={() => setPage(page + 1)} className="rounded-lg border border-border p-2 hover:bg-surface disabled:opacity-40"><ChevronRight size={16} aria-hidden="true" /></button></div></div>}
      </section>
    </>
  );
}
