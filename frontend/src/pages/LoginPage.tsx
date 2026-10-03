import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, GraduationCap, IdCard, LoaderCircle, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import Button from '../components/ui/Button';
import FormField from '../components/forms/FormField';
import { authErrorMessage, login } from '../features/auth/auth-api';
import { sessionQueryKey, useAuth } from '../features/auth/use-auth';
import type { Role } from '../features/auth/types';

const inputClass = 'w-full rounded-lg border border-border bg-white py-3 pl-11 pr-4 text-sm text-primary placeholder:text-slate-400 transition-colors focus:border-accent disabled:bg-surface';

function formSchema(role: Role) {
  return z.object({
    identifier: role === 'ADMIN'
      ? z.string().trim().min(1, 'Username wajib diisi.').max(64, 'Username maksimal 64 karakter.')
        .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.')
      : z.string().trim().min(1, 'NIM wajib diisi.').max(32, 'NIM maksimal 32 karakter.')
        .regex(/^\d+$/, 'NIM hanya boleh berisi angka.'),
    password: z.string().min(1, 'Password wajib diisi.')
      .refine((value) => new TextEncoder().encode(value).length <= 72, 'Password maksimal 72 byte.'),
  });
}

type LoginFields = z.infer<ReturnType<typeof formSchema>>;

export default function LoginPage() {
  const [role, setRole] = useState<Role>('STUDENT');
  const [showPassword, setShowPassword] = useState(false);
  const session = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<LoginFields>({
    resolver: zodResolver(formSchema(role)),
    defaultValues: { identifier: '', password: '' },
  });
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (user) => {
      await queryClient.cancelQueries({ queryKey: sessionQueryKey });
      queryClient.setQueryData(sessionQueryKey, user);
      form.reset();
      navigate('/', { replace: true });
    },
  });

  if (session.data) return <Navigate to="/" replace />;

  const isAdmin = role === 'ADMIN';
  const IdentifierIcon = isAdmin ? UserRound : IdCard;
  const switchRole = (nextRole: Role) => {
    if (mutation.isPending) return;
    setRole(nextRole);
    form.reset();
    mutation.reset();
    setShowPassword(false);
  };
  const submit = form.handleSubmit((values) => {
    mutation.mutate(isAdmin
      ? { role: 'ADMIN', username: values.identifier, password: values.password }
      : { role: 'STUDENT', nim: values.identifier, password: values.password });
  });

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[1fr_1fr]">
      <section className="relative overflow-hidden border-b border-border bg-surface px-6 py-8 sm:px-12 lg:flex lg:min-h-screen lg:flex-col lg:border-r lg:border-b-0 lg:px-16 lg:py-12">
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-white">
            <GraduationCap size={24} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">Sistem Akademik</p>
            <p className="mt-0.5 text-xs text-secondary">Program Doktor</p>
          </div>
        </div>

        <div className="relative z-10 hidden max-w-lg flex-1 flex-col justify-center py-16 lg:flex">
          <div className="mb-6 h-1 w-12 rounded-full bg-accent" />
          <h1 className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
            Perjalanan akademik,<br /><span className="text-accent">dalam satu ruang.</span>
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-secondary">
            Sistem Manajemen Mahasiswa Doktor. Akses akun Anda untuk melanjutkan perjalanan akademik.
          </p>
          <div aria-hidden="true" className="relative mt-12 h-40 max-w-sm">
            <div className="absolute inset-x-4 top-5 h-28 rounded-2xl border border-blue-100 bg-white/60 rotate-[-6deg]" />
            <div className="absolute inset-x-0 top-0 flex h-28 items-center gap-5 rounded-2xl border border-border bg-white px-6 shadow-sm">
              <span className="flex size-14 items-center justify-center rounded-xl bg-blue-50 text-accent"><GraduationCap size={30} strokeWidth={1.5} /></span>
              <div className="space-y-3"><div className="h-2.5 w-32 rounded-full bg-slate-200" /><div className="h-2 w-24 rounded-full bg-slate-100" /></div>
              <span className="ml-auto size-3 rounded-full bg-blue-100" />
            </div>
          </div>
        </div>

        <p className="relative z-10 hidden text-xs text-secondary lg:block">Sistem Manajemen Mahasiswa Doktor</p>
        <div aria-hidden="true" className="pointer-events-none absolute -right-48 -bottom-48 hidden size-[32rem] rounded-full border border-blue-100 lg:block" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -bottom-32 hidden size-96 rounded-full border border-blue-100 lg:block" />
      </section>

      <section className="flex min-h-[calc(100vh-109px)] items-center justify-center px-6 py-12 sm:px-12 lg:min-h-screen lg:py-16">
        <div className="w-full max-w-sm">
          <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-accent uppercase">Selamat datang</p>
          <h2 className="text-3xl font-semibold tracking-tight">Masuk ke akun Anda</h2>
          <p className="mt-3 text-sm leading-6 text-secondary">Pilih jenis akun dan masukkan data Anda.</p>

          <fieldset className="mt-8" disabled={mutation.isPending}>
            <legend className="sr-only">Jenis akun</legend>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface p-1">
              {([{ value: 'STUDENT', label: 'Mahasiswa', Icon: GraduationCap }, { value: 'ADMIN', label: 'Admin', Icon: ShieldCheck }] as const).map(({ value, label, Icon }) => (
                <label key={value} className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent ${role === value ? 'bg-white text-accent shadow-sm' : 'text-secondary hover:text-primary'}`}>
                  <input className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed" type="radio" name="account-role" value={value} checked={role === value} onChange={() => switchRole(value)} />
                  <Icon size={17} aria-hidden="true" />{label}
                </label>
              ))}
            </div>
          </fieldset>

          <form className="mt-7 space-y-5" onSubmit={(event) => { void submit(event); }} noValidate>
            <FormField id="identifier" label={isAdmin ? 'Username' : 'Nomor Induk Mahasiswa (NIM)'} error={form.formState.errors.identifier?.message}>
              <div className="relative">
                <IdentifierIcon className="pointer-events-none absolute top-3.5 left-3.5 text-secondary" size={18} aria-hidden="true" />
                <input
                  {...form.register('identifier')}
                  id="identifier"
                  className={inputClass}
                  type="text"
                  inputMode={isAdmin ? 'text' : 'numeric'}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={isAdmin ? 'Masukkan username Anda' : 'Masukkan NIM Anda'}
                  disabled={mutation.isPending}
                  aria-invalid={Boolean(form.formState.errors.identifier)}
                  aria-describedby={form.formState.errors.identifier ? 'identifier-error' : undefined}
                />
              </div>
            </FormField>

            <FormField id="password" label="Password" error={form.formState.errors.password?.message}>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute top-3.5 left-3.5 text-secondary" size={18} aria-hidden="true" />
                <input
                  {...form.register('password')}
                  id="password"
                  className={`${inputClass} pr-12`}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Masukkan password Anda"
                  disabled={mutation.isPending}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby={form.formState.errors.password ? 'password-error' : undefined}
                />
                <button type="button" className="absolute top-1 right-1 flex size-10 items-center justify-center rounded-md text-secondary hover:text-primary" aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </FormField>

            {mutation.isError && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-6 text-error">{authErrorMessage(mutation.error)}</p>}

            <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
              {mutation.isPending ? <><LoaderCircle size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />Memproses...</> : <>Masuk sebagai {isAdmin ? 'Admin' : 'Mahasiswa'}<ArrowRight size={17} aria-hidden="true" /></>}
            </Button>
          </form>

          <p className="mt-7 text-center text-xs leading-5 text-secondary">Gunakan akun yang telah diberikan oleh pengelola program.</p>
          <div className="mt-10 flex items-center justify-center gap-2 border-t border-border pt-6 text-xs text-secondary"><ShieldCheck size={14} aria-hidden="true" />Akses khusus civitas akademika</div>
        </div>
      </section>
    </main>
  );
}
