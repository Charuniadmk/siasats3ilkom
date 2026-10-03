import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import axios from 'axios';
import { Info, LoaderCircle, ShieldCheck, UserPlus } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import FormField from '../components/forms/FormField';
import Button from '../components/ui/Button';
import { authErrorMessage } from '../features/auth/auth-api';
import { useSessionExpiry } from '../features/auth/use-session-expiry';
import { createStudent, studentsQueryKey } from '../features/students/students-api';

const schema = z.object({
  nim: z.string().trim().min(1, 'NIM wajib diisi.').max(32, 'NIM maksimal 32 karakter.').regex(/^\d+$/, 'NIM hanya boleh berisi angka.'),
  password: z.string().min(8, 'Password minimal 8 karakter.').refine((value) => new TextEncoder().encode(value).length <= 72, 'Password maksimal 72 byte.'),
  confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi.'),
}).refine((data) => data.password === data.confirmPassword, { message: 'Konfirmasi password tidak sesuai.', path: ['confirmPassword'] });
type CreateStudentFields = z.infer<typeof schema>;
const inputClass = 'w-full rounded-lg border border-border bg-white px-3.5 py-3 text-sm placeholder:text-slate-400 focus:border-accent disabled:bg-surface';

export default function CreateStudentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<CreateStudentFields>({ resolver: zodResolver(schema), defaultValues: { nim: '', password: '', confirmPassword: '' } });
  const mutation = useMutation({
    mutationFn: createStudent,
    onSuccess: async (student) => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: studentsQueryKey });
      navigate('/students', { replace: true, state: { successMessage: `Akun mahasiswa dengan NIM ${student.nim} berhasil dibuat.` } });
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) form.setError('nim', { message: authErrorMessage(error) }, { shouldFocus: true });
    },
  });
  useSessionExpiry(mutation.error);
  const submit = form.handleSubmit(({ nim, password }) => mutation.mutate({ nim, password }));

  return (
    <>
      <PageHeader title="Tambah Akun Mahasiswa" description="Buat akses masuk untuk mahasiswa program doktor." />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-border bg-white shadow-sm">
          <div className="border-b border-border px-6 py-5 sm:px-8"><h2 className="text-base font-semibold">Informasi akun</h2><p className="mt-1 text-sm text-secondary">Mahasiswa akan masuk menggunakan NIM dan password ini.</p></div>
          <form className="space-y-6 p-6 sm:p-8" onSubmit={(event) => { void submit(event); }} noValidate>
            <FormField id="student-nim" label="Nomor Induk Mahasiswa (NIM)" error={form.formState.errors.nim?.message}>
              <input {...form.register('nim')} id="student-nim" type="text" inputMode="numeric" autoComplete="off" placeholder="Masukkan NIM mahasiswa" className={inputClass} disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.nim)} aria-describedby={form.formState.errors.nim ? 'student-nim-error' : 'nim-hint'} />
              <p id="nim-hint" className="mt-2 text-xs text-secondary">Gunakan NIM resmi mahasiswa, termasuk angka nol di awal.</p>
            </FormField>
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField id="student-password" label="Password" error={form.formState.errors.password?.message}><input {...form.register('password')} id="student-password" type="password" autoComplete="new-password" placeholder="Minimal 8 karakter" className={inputClass} disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.password)} aria-describedby={form.formState.errors.password ? 'student-password-error' : undefined} /></FormField>
              <FormField id="student-password-confirm" label="Konfirmasi Password" error={form.formState.errors.confirmPassword?.message}><input {...form.register('confirmPassword')} id="student-password-confirm" type="password" autoComplete="new-password" placeholder="Ulangi password" className={inputClass} disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.confirmPassword)} aria-describedby={form.formState.errors.confirmPassword ? 'student-password-confirm-error' : undefined} /></FormField>
            </div>
            {mutation.isError && !(axios.isAxiosError(mutation.error) && mutation.error.response?.status === 409) && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-error">{authErrorMessage(mutation.error)}</p>}
            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-6"><button type="button" disabled={mutation.isPending} onClick={() => navigate('/students')} className="rounded-lg border border-border px-5 py-3 text-sm font-medium hover:bg-surface disabled:opacity-50">Batal</button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <UserPlus size={17} aria-hidden="true" />}{mutation.isPending ? 'Menyimpan...' : 'Simpan Akun'}</Button></div>
          </form>
        </section>
        <aside className="rounded-2xl border border-border bg-white p-6 shadow-sm"><Info className="mb-4 text-accent" size={22} aria-hidden="true" /><h2 className="text-sm font-semibold">Akses mahasiswa</h2><p className="mt-3 text-sm leading-6 text-secondary">Akun yang dibuat memiliki peran Mahasiswa. NIM tidak boleh sama dengan akun mahasiswa lain.</p><div className="my-5 border-t border-border" /><ShieldCheck size={18} className="mb-2 text-secondary" aria-hidden="true" /><p className="text-xs leading-5 text-secondary">Sampaikan NIM dan password kepada mahasiswa yang bersangkutan melalui saluran pribadi.</p><Link to="/students" className="mt-5 inline-block text-xs font-medium text-accent hover:underline">Lihat daftar mahasiswa</Link></aside>
      </div>
    </>
  );
}
