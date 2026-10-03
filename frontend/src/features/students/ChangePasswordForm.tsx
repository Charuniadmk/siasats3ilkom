import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { LockKeyhole } from 'lucide-react';
import FormField from '../../components/forms/FormField';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { changeMyPassword } from './profile-api';
import { authErrorMessage } from '../auth/auth-api';
import { sessionQueryKey } from '../auth/use-auth';
import { useSessionExpiry } from '../auth/use-session-expiry';

const schema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi.').refine((value) => new TextEncoder().encode(value).length <= 72, 'Password saat ini maksimal 72 byte.'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter.').refine((value) => new TextEncoder().encode(value).length <= 72, 'Password baru maksimal 72 byte.'),
  confirmPassword: z.string().min(1, 'Konfirmasi password wajib diisi.').refine((value) => new TextEncoder().encode(value).length <= 72, 'Konfirmasi password maksimal 72 byte.'),
}).refine((input) => input.newPassword === input.confirmPassword, { message: 'Konfirmasi password tidak sesuai.', path: ['confirmPassword'] }).refine((input) => input.newPassword !== input.currentPassword, { message: 'Password baru harus berbeda dari password saat ini.', path: ['newPassword'] });

export default function ChangePasswordForm() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  const mutation = useMutation({
    mutationFn: changeMyPassword,
    onSuccess: async () => {
      form.reset();
      await client.cancelQueries();
      client.clear();
      client.setQueryData(sessionQueryKey, null);
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    },
  });
  useSessionExpiry(mutation.error);
  const submit = form.handleSubmit((input) => mutation.mutate(input));
  return <section className="max-w-3xl rounded-2xl border border-border bg-white shadow-sm">
    <div className="border-b border-border px-6 py-5 sm:px-8"><h2 className="text-base font-semibold">Ubah Password</h2><p className="mt-1 text-sm leading-6 text-secondary">Setelah password diubah, semua sesi akun akan diakhiri. Silakan masuk kembali dengan password baru.</p></div>
    <form noValidate onSubmit={(event) => { void submit(event); }} className="space-y-6 p-6 sm:p-8">
      <FormField id="current-password" label="Password Saat Ini" error={form.formState.errors.currentPassword?.message}><Input {...form.register('currentPassword')} id="current-password" type="password" autoComplete="current-password" placeholder="Masukkan password saat ini" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.currentPassword)} aria-describedby={form.formState.errors.currentPassword ? 'current-password-error' : undefined} /></FormField>
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField id="new-password" label="Password Baru" error={form.formState.errors.newPassword?.message}><Input {...form.register('newPassword')} id="new-password" type="password" autoComplete="new-password" placeholder="Minimal 8 karakter" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.newPassword)} aria-describedby={form.formState.errors.newPassword ? 'new-password-error' : undefined} /></FormField>
        <FormField id="confirm-new-password" label="Konfirmasi Password Baru" error={form.formState.errors.confirmPassword?.message}><Input {...form.register('confirmPassword')} id="confirm-new-password" type="password" autoComplete="new-password" placeholder="Ulangi password baru" disabled={mutation.isPending} aria-invalid={Boolean(form.formState.errors.confirmPassword)} aria-describedby={form.formState.errors.confirmPassword ? 'confirm-new-password-error' : undefined} /></FormField>
      </div>
      {mutation.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-error">{authErrorMessage(mutation.error)}</p>}
      <div className="flex justify-end gap-3 border-t border-border pt-5"><button type="button" disabled={mutation.isPending} onClick={() => { form.reset(); mutation.reset(); }} className="rounded-lg border border-border px-5 py-3 text-sm hover:bg-surface disabled:opacity-50">Batal</button><Button type="submit" disabled={mutation.isPending}><LockKeyhole size={17} aria-hidden="true" />{mutation.isPending ? 'Menyimpan...' : 'Ubah Password'}</Button></div>
    </form>
  </section>;
}
