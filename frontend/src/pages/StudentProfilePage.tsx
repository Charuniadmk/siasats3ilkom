import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, UserRound } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/ui/Button';
import ChangePasswordForm from '../features/students/ChangePasswordForm';
import StudentProfileFormFields from '../features/students/StudentProfileFormFields';
import { studentProfileSchema, type StudentProfileFields } from '../features/students/students-schema';
import { getMyProfile, updateMyProfile } from '../features/students/profile-api';
import type { StudentAccount } from '../features/students/students-api';
import { authErrorMessage } from '../features/auth/auth-api';
import { sessionQueryKey, useAuth } from '../features/auth/use-auth';
import { useSessionExpiry } from '../features/auth/use-session-expiry';

const formValues = (profile: StudentAccount) => ({ nim: profile.nim, fullName: profile.fullName ?? '', gender: profile.gender ?? undefined, address: profile.address ?? '', birthDate: profile.birthDate?.slice(0, 10) ?? '' });

function ProfileForm({ profile, queryKey }: { profile: StudentAccount; queryKey: readonly string[] }) {
  const client = useQueryClient();
  const [saved, setSaved] = useState(false);
  const form = useForm<StudentProfileFields>({ resolver: zodResolver(studentProfileSchema), defaultValues: formValues(profile) });
  const mutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async (updated) => {
      client.setQueryData(queryKey, updated);
      form.reset(formValues(updated));
      setSaved(true);
      await client.invalidateQueries({ queryKey: sessionQueryKey });
    },
  });
  useSessionExpiry(mutation.error);
  const submit = form.handleSubmit(({ fullName, gender, address, birthDate }) => { setSaved(false); mutation.mutate({ fullName, gender, address, birthDate }); });
  return <section className="max-w-3xl rounded-2xl border border-border bg-white shadow-sm">
    <div className="border-b border-border px-6 py-5 sm:px-8"><h2 className="text-base font-semibold">Data pribadi</h2><p className="mt-1 text-sm text-secondary">Perbarui data diri Anda. NIM dikelola oleh Admin.</p></div>
    <FormProvider {...form}><form noValidate onSubmit={(event) => { void submit(event); }} className="space-y-6 p-6 sm:p-8">
      <StudentProfileFormFields disabled={mutation.isPending} readOnlyNim />
      {saved && <p role="status" className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"><CheckCircle2 size={18} aria-hidden="true" />Profil berhasil diperbarui.</p>}
      {mutation.isError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-error">{authErrorMessage(mutation.error)}</p>}
      <div className="flex justify-end gap-3 border-t border-border pt-5"><button type="button" disabled={mutation.isPending} onClick={() => { form.reset(formValues(profile)); setSaved(false); mutation.reset(); }} className="rounded-lg border border-border px-5 py-3 text-sm hover:bg-surface disabled:opacity-50">Batal</button><Button type="submit" disabled={mutation.isPending}><UserRound size={17} aria-hidden="true" />{mutation.isPending ? 'Menyimpan...' : 'Simpan Profil'}</Button></div>
    </form></FormProvider>
  </section>;
}

export default function StudentProfilePage() {
  const session = useAuth();
  const queryKey = ['profile', session.data?.id ?? ''] as const;
  const profile = useQuery({ queryKey, queryFn: ({ signal }) => getMyProfile(signal), retry: false });
  useSessionExpiry(profile.error);
  return <>
    <PageHeader title="Profil" description="Kelola informasi pribadi Anda sebagai mahasiswa program doktor." />
    {profile.isPending ? <p role="status" className="p-10 text-center text-secondary">Memuat profil...</p> : profile.isError ? <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-white p-10"><p role="alert" className="text-sm text-error">{authErrorMessage(profile.error)}</p><Button onClick={() => { void profile.refetch(); }}>Coba kembali</Button></div> : <div className="space-y-6"><ProfileForm key={profile.data.id} profile={profile.data} queryKey={queryKey} /><ChangePasswordForm /></div>}
  </>;
}
