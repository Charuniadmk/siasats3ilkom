import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import FormField from '../../components/forms/FormField';
import StudentProfileFormFields from './StudentProfileFormFields';
import { studentProfileSchema } from './students-schema';
import { authErrorMessage } from '../auth/auth-api';
import { useSessionExpiry } from '../auth/use-session-expiry';
import { updateStudent, studentsQueryKey, type StudentAccount } from './students-api';

const schema = studentProfileSchema.extend({
  password: z.string().refine((value) => !value || value.length >= 8, 'Password minimal 8 karakter.').refine((value) => new TextEncoder().encode(value).length <= 72, 'Password maksimal 72 byte.'),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, { message: 'Konfirmasi password tidak sesuai.', path: ['confirmPassword'] });

export default function EditStudentModal({ student, onClose, onSuccess }: { student: StudentAccount; onClose: () => void; onSuccess: (message: string) => void }) {
  const client = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { nim: student.nim, fullName: student.fullName ?? '', gender: student.gender ?? undefined, address: student.address ?? '', birthDate: student.birthDate?.slice(0, 10) ?? '', password: '', confirmPassword: '' } });
  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof updateStudent>[1]) => updateStudent(student.id, input),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: studentsQueryKey }); onSuccess('Akun mahasiswa berhasil diperbarui.'); onClose(); },
  });
  useSessionExpiry(mutation.error);
  const submit = form.handleSubmit(({ nim, fullName, gender, address, birthDate, password }) => mutation.mutate({ nim, fullName, gender, address, birthDate, ...(password && { password }) }));
  return <Modal title="Ubah Akun Mahasiswa" onClose={onClose} busy={mutation.isPending}>
    <FormProvider {...form}><form noValidate onSubmit={(event) => { void submit(event); }} className="space-y-5">
      <StudentProfileFormFields disabled={mutation.isPending} />
      <p className="text-sm text-secondary">Kosongkan password jika tidak ingin mengubahnya. Perubahan akun akan mengakhiri sesi mahasiswa.</p>
      <FormField id="edit-password" label="Password Baru" error={form.formState.errors.password?.message}><Input {...form.register('password')} id="edit-password" type="password" autoComplete="new-password" placeholder="Minimal 8 karakter" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.password)} aria-describedby={form.formState.errors.password ? 'edit-password-error' : undefined} /></FormField>
      <FormField id="edit-confirm" label="Konfirmasi Password" error={form.formState.errors.confirmPassword?.message}><Input {...form.register('confirmPassword')} id="edit-confirm" type="password" autoComplete="new-password" placeholder="Ulangi password baru" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.confirmPassword)} aria-describedby={form.formState.errors.confirmPassword ? 'edit-confirm-error' : undefined} /></FormField>
      {mutation.isError && <p role="alert" className="text-sm text-error">{authErrorMessage(mutation.error)}</p>}
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} disabled={mutation.isPending} className="rounded-lg border border-border px-5 py-3 text-sm">Batal</button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button></div>
    </form></FormProvider>
  </Modal>;
}
