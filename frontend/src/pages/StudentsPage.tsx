import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Pencil, Trash2, UserPlus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import InputDate from '../components/ui/InputDate';
import FormField from '../components/forms/FormField';
import Modal from '../components/ui/Modal';
import DataTable, { type DataTableColumn } from '../components/ui/DataTable';
import EditStudentModal from '../features/students/EditStudentModal';
import { authErrorMessage } from '../features/auth/auth-api';
import { useSessionExpiry } from '../features/auth/use-session-expiry';
import { deleteStudent, listStudents, studentsQueryKey, type StudentAccount, type StudentListParams } from '../features/students/students-api';

export default function StudentsPage() {
  const [params, setParams] = useState<StudentListParams>({ page: 1, limit: 20, search: '', sortBy: 'createdAt', sortOrder: 'desc' });
  const [searchDraft, setSearchDraft] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterError, setFilterError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<StudentAccount | null>(null);
  const [deleting, setDeleting] = useState<StudentAccount | null>(null);
  const [message, setMessage] = useState('');
  const location = useLocation();
  const state: unknown = location.state;
  const successMessage = message || (typeof state === 'object' && state !== null && 'successMessage' in state && typeof state.successMessage === 'string' ? state.successMessage : '');
  const client = useQueryClient();
  const students = useQuery({ queryKey: [...studentsQueryKey, params], queryFn: ({ signal }) => listStudents(params, signal), retry: false });
  const remove = useMutation({
    mutationFn: deleteStudent,
    onSuccess: async () => {
      setDeleting(null); setSelectedIds([]); setMessage('Akun mahasiswa berhasil dihapus.');
      if (students.data?.data.length === 1 && params.page > 1) setParams((previous) => ({ ...previous, page: previous.page - 1 }));
      await client.invalidateQueries({ queryKey: studentsQueryKey });
    },
  });
  useSessionExpiry(students.error);
  useSessionExpiry(remove.error);
  const changeParams = (next: Partial<StudentListParams>) => { setSelectedIds([]); setParams((previous) => ({ ...previous, page: 1, ...next })); };
  const columns: DataTableColumn<StudentAccount>[] = [
    { key: 'nim', header: 'NIM', sortable: true, render: (student) => <span className="font-medium tabular-nums">{student.nim}</span> },
    { key: 'fullName', header: 'Nama lengkap', sortable: true, render: (student) => student.fullName || 'Belum dilengkapi' },
    { key: 'role', header: 'Jenis akun', render: () => <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs text-accent">Mahasiswa</span> },
    { key: 'createdAt', header: 'Tanggal dibuat', sortable: true, render: (student) => <span className="text-secondary">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(student.createdAt))}</span> },
    { key: 'actions', header: 'Tindakan', render: (student) => <div className="flex gap-3"><button type="button" onClick={() => setEditing(student)} aria-label={`Ubah mahasiswa ${student.nim}`} className="inline-flex items-center gap-1.5 text-accent hover:underline"><Pencil size={15} aria-hidden="true" />Ubah</button><button type="button" onClick={() => { remove.reset(); setDeleting(student); }} aria-label={`Hapus mahasiswa ${student.nim}`} className="inline-flex items-center gap-1.5 text-error hover:underline"><Trash2 size={15} aria-hidden="true" />Hapus</button></div> },
  ];
  return <>
    <PageHeader title="Mahasiswa" description="Kelola akun mahasiswa untuk mengakses sistem akademik." action={<Link to="/students/new" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"><UserPlus size={17} aria-hidden="true" />Tambah Akun Mahasiswa</Link>} />
    {successMessage && <p role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={18} aria-hidden="true" />{successMessage}</p>}
    <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="border-b border-border p-5 sm:p-6">
        <h2 className="text-base font-semibold">Daftar akun mahasiswa</h2><p className="mt-1 text-xs text-secondary">{students.data ? `${students.data.meta.total} akun ditemukan` : 'Akun mahasiswa program doktor'}</p>
        <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={(event) => {
          event.preventDefault();
          if (dateFrom && dateTo && dateFrom > dateTo) { setFilterError('Tanggal akhir harus sama atau setelah tanggal awal.'); return; }
          setFilterError(''); changeParams({ search: searchDraft.trim(), dateFrom: dateFrom || undefined, dateTo: dateTo || undefined });
        }}>
          <div className="min-w-0 flex-1 sm:min-w-52"><FormField id="student-search" label="Cari berdasarkan NIM atau nama"><Input id="student-search" type="search" placeholder="Cari berdasarkan NIM atau nama..." value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={150} /></FormField></div>
          <div className="w-full sm:w-56"><FormField id="student-date-from" label="Tanggal dibuat mulai"><InputDate id="student-date-from" label="Pilih tanggal mulai" value={dateFrom} onChange={setDateFrom} /></FormField></div>
          <div className="w-full sm:w-56"><FormField id="student-date-to" label="Tanggal dibuat sampai"><InputDate id="student-date-to" label="Pilih tanggal sampai" value={dateTo} onChange={setDateTo} /></FormField></div>
          <button type="submit" className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface">Cari</button>
          <button type="button" className="px-3 py-2.5 text-sm text-secondary hover:text-accent" onClick={() => { setSearchDraft(''); setDateFrom(''); setDateTo(''); setFilterError(''); changeParams({ search: '', dateFrom: undefined, dateTo: undefined }); }}>Atur ulang filter</button>
        </form>
        {filterError && <p role="alert" className="mt-3 text-sm text-error">{filterError}</p>}
      </div>
      <DataTable columns={columns} data={students.data?.data ?? []} getRowId={(student) => student.id} getRowLabel={(student) => `mahasiswa ${student.nim}`} caption="Daftar akun mahasiswa" sort={{ key: params.sortBy, direction: params.sortOrder }} onSortChange={(sort) => { if (sort.key === 'nim' || sort.key === 'fullName' || sort.key === 'createdAt') changeParams({ sortBy: sort.key, sortOrder: sort.direction }); }} selectedIds={selectedIds} onSelectionChange={setSelectedIds} meta={students.data?.meta} onPageChange={(page) => changeParams({ page })} onPageSizeChange={(limit) => changeParams({ limit })} loading={students.isFetching} error={students.isError ? authErrorMessage(students.error) : undefined} onRetry={() => { void students.refetch(); }} emptyMessage={params.search || params.dateFrom || params.dateTo ? 'Mahasiswa tidak ditemukan.' : 'Belum ada akun mahasiswa.'} />
    </section>
    {editing && <EditStudentModal student={editing} onClose={() => setEditing(null)} onSuccess={setMessage} />}
    {deleting && <Modal title="Hapus Akun Mahasiswa" onClose={() => setDeleting(null)} busy={remove.isPending}><p className="text-sm leading-6">Apakah Anda yakin ingin menghapus akun mahasiswa dengan NIM <strong>{deleting.nim}</strong>? Tindakan ini tidak dapat dibatalkan.</p>{remove.isError && <p role="alert" className="mt-4 text-sm text-error">{authErrorMessage(remove.error)}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={remove.isPending} onClick={() => setDeleting(null)} className="rounded-lg border border-border px-5 py-3 text-sm">Batal</button><Button disabled={remove.isPending} onClick={() => remove.mutate(deleting.id)} className="bg-red-600 hover:bg-red-700">{remove.isPending ? 'Menghapus...' : 'Hapus'}</Button></div></Modal>}
  </>;
}
