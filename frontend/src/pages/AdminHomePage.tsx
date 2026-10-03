import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap, UserPlus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../features/auth/use-auth';

export default function AdminHomePage() {
  const session = useAuth();
  return (
    <>
      <PageHeader title="Dashboard" description={`Selamat datang, ${session.data?.username ?? 'Admin'}.`} />
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <span className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-accent"><GraduationCap size={27} aria-hidden="true" /></span>
        <h2 className="text-xl font-semibold">Ruang administrasi akademik</h2>
        <p className="mt-2 text-sm text-secondary">Anda berhasil masuk sebagai Admin.</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-secondary">Kelola akses mahasiswa melalui menu Mahasiswa. Gunakan sidebar untuk membuka bagian akademik yang Anda perlukan.</p>
        <Link to="/students/new" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"><UserPlus size={17} aria-hidden="true" />Tambah Akun Mahasiswa<ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
    </>
  );
}
