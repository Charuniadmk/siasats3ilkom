import { FileClock } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';

export default function FeaturePlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} description="Manajemen akademik mahasiswa doktor." />
      <section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <span className="mb-5 rounded-2xl bg-surface p-4 text-secondary"><FileClock size={30} strokeWidth={1.5} aria-hidden="true" /></span>
        <h2 className="text-base font-semibold">Halaman sedang disiapkan</h2><p className="mt-2 text-sm text-secondary">Fitur ini sedang dalam tahap pengembangan.</p>
      </section>
    </>
  );
}
