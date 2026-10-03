import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import PageHeader from '../../components/common/PageHeader';
import PdfPreview from '../../components/common/PdfPreview';
import FormField from '../../components/forms/FormField';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import InputDate from '../../components/ui/InputDate';
import Button from '../../components/ui/Button';
import SubmissionBadge from '../../components/ui/SubmissionBadge';
import { authErrorMessage } from '../auth/auth-api';
import { useSessionExpiry } from '../auth/use-session-expiry';
import {
  getSubmission,
  saveSubmission,
  submissionAction,
  uploadSubmissionFile,
  requiredDocuments,
  submissionTitle,
  downloadDocument,
  type AcademicForm,
  type Submission,
  type SubmissionKind,
  type SubmissionDocument,
} from './submissions-api';

function SubmissionEditor({ initial, kind }: { initial: Submission; kind: SubmissionKind }) {
  const client = useQueryClient();
  const key = ['submission', kind];
  const form = useForm<AcademicForm>({ defaultValues: initial.formData });
  const formDate = useWatch({ control: form.control, name: 'formDate' });
  const [preview, setPreview] = useState<SubmissionDocument | null>(null);
  const [notice, setNotice] = useState('');
  const [fileError, setFileError] = useState('');
  const locked = initial.status === 'PENDING' || initial.status === 'APPROVED';
  const dirty = form.formState.isDirty;
  const mutation = useMutation({
    mutationFn: async (action: {
      type: 'save' | 'generate' | 'submit' | 'upload';
      documentType?: string;
      file?: File;
    }) => {
      if (action.type === 'upload')
        return uploadSubmissionFile(kind, action.documentType!, action.file!);
      if (action.type === 'save' || action.type === 'generate') {
        const saved = await saveSubmission(kind, form.getValues());
        client.setQueryData(key, { ...saved, maxDocumentSizeMb: initial.maxDocumentSizeMb });
        if (action.type === 'save') return saved;
      }
      return submissionAction(kind, action.type === 'submit' ? 'submit' : 'generate');
    },
    onSuccess: (data, action) => {
      client.setQueryData(key, { ...data, maxDocumentSizeMb: initial.maxDocumentSizeMb });
      if (action.type === 'save' || action.type === 'generate') form.reset(data.formData);
      setNotice(
        action.type === 'submit'
          ? 'Pengajuan berhasil dikirim.'
          : action.type === 'upload'
            ? 'Dokumen berhasil diunggah.'
            : action.type === 'generate'
              ? 'PDF formulir berhasil dibuat.'
              : 'Draft berhasil disimpan.',
      );
      setFileError('');
    },
  });
  useSessionExpiry(mutation.error);
  const busy = mutation.isPending;
  const complete = requiredDocuments(kind).every((d) =>
    initial.documents.some((file) => file.type === d.type),
  );
  const upload = (file: File | undefined, type: string) => {
    if (!file) return;
    const signature = type === 'SIGNATURE';
    const max = signature ? 2 : (initial.maxDocumentSizeMb ?? 10);
    if (
      (signature
        ? file.type !== 'image/png' || !/\.png$/i.test(file.name)
        : file.type !== 'application/pdf' || !/\.pdf$/i.test(file.name)) ||
      file.size > max * 1024 * 1024
    ) {
      setFileError(
        signature ? 'Pilih PNG transparan maksimal 2 MB.' : `Pilih dokumen PDF maksimal ${max} MB.`,
      );
      return;
    }
    mutation.mutate({ type: 'upload', documentType: type, file });
  };
  const signature = initial.documents.find((d) => d.type === 'SIGNATURE');
  const fields: { key: keyof AcademicForm; label: string; max: number }[] = [
    { key: 'phone', label: 'Nomor Telepon', max: 30 },
    { key: 'program', label: 'Program Studi', max: 150 },
    { key: 'promoter', label: 'Promotor', max: 150 },
    { key: 'coPromoter1', label: 'Co-Promotor 1', max: 150 },
    { key: 'coPromoter2', label: 'Co-Promotor 2 (opsional)', max: 150 },
    { key: 'city', label: 'Kota', max: 100 },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SubmissionBadge status={initial.status} />
        {initial.submittedAt && (
          <p className="text-sm text-secondary">
            Diajukan pada {new Date(initial.submittedAt).toLocaleString('id-ID')}
          </p>
        )}
      </div>
      {initial.status === 'REJECTED' && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-5">
          <h2 className="font-semibold">Alasan Penolakan</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm">{initial.rejectionReason}</p>
          <p className="mt-3 text-sm text-secondary">
            Perbaiki data atau dokumen, lalu kirim kembali pengajuan.
          </p>
        </div>
      )}
      {locked && (
        <p className="rounded-xl border border-border bg-white p-4 text-sm text-secondary">
          Pengajuan hanya dapat dilihat. Anda tetap dapat melihat dan mengunduh setiap dokumen PDF.
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {notice}
        </p>
      )}
      {(mutation.isError || fileError) && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-error">
          {fileError || authErrorMessage(mutation.error)}
        </p>
      )}
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold">
          {kind === 'PROPOSAL'
            ? 'Formulir Pendaftaran Ujian Proposal'
            : 'Form Pendaftaran Ujian Kualifikasi Disertasi'}
        </h2>
        <p className="mt-2 text-sm text-secondary">
          Identitas diambil dari{' '}
          <Link to="/profile" className="text-accent">
            Profil mahasiswa
          </Link>
          . Lengkapi data sebelum membuat PDF.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate({ type: 'save' });
          }}
          className="mt-6 space-y-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="academic-name" label="Nama Lengkap">
              <Input id="academic-name" value={initial.student.fullName ?? ''} readOnly />
            </FormField>
            <FormField id="academic-nim" label="NIM">
              <Input id="academic-nim" value={initial.student.nim ?? ''} readOnly />
            </FormField>
          </div>
          {kind === 'PROPOSAL' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="academic-gender" label="Jenis Kelamin">
                <Input
                  id="academic-gender"
                  value={
                    initial.student.gender === 'MALE'
                      ? 'Laki-laki'
                      : initial.student.gender === 'FEMALE'
                        ? 'Perempuan'
                        : 'Belum dilengkapi'
                  }
                  readOnly
                />
              </FormField>
              <FormField id="academic-address" label="Alamat Tinggal">
                <Textarea id="academic-address" value={initial.student.address ?? ''} readOnly />
              </FormField>
            </div>
          )}
          <fieldset disabled={locked || busy} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {fields.map(({ key: field, label, max }) => (
                <FormField key={field} id={`academic-${field}`} label={label}>
                  <Input
                    {...form.register(field)}
                    id={`academic-${field}`}
                    maxLength={max}
                    placeholder={`Masukkan ${label.toLowerCase()}`}
                  />
                </FormField>
              ))}
              <FormField id="academic-date" label="Tanggal Formulir">
                <InputDate
                  id="academic-date"
                  value={formDate}
                  onChange={(value) => form.setValue('formDate', value, { shouldDirty: true })}
                  disabled={locked || busy}
                />
              </FormField>
            </div>
            <FormField
              id="academic-title"
              label={kind === 'PROPOSAL' ? 'Judul Disertasi' : 'Judul Artikel'}
            >
              <Textarea
                {...form.register('title')}
                id="academic-title"
                maxLength={1000}
                rows={4}
                placeholder={
                  kind === 'PROPOSAL' ? 'Masukkan judul disertasi' : 'Masukkan judul artikel'
                }
              />
            </FormField>
          </fieldset>
          {!locked && (
            <div className="rounded-xl border border-dashed border-border bg-surface p-5">
              <FormField id="academic-signature" label="Tanda Tangan Mahasiswa (PNG transparan)">
                <Input
                  id="academic-signature"
                  type="file"
                  accept="image/png,.png"
                  disabled={busy}
                  onChange={(e) => {
                    upload(e.target.files?.[0], 'SIGNATURE');
                    e.target.value = '';
                  }}
                />
              </FormField>
              <p className="mt-3 text-xs leading-5 text-secondary">
                Maksimal 2 MB. Tanda tangan dibatasi pada area mahasiswa di PDF dan tidak dapat
                dipindahkan ke area pembimbing.
              </p>
              <div className="mt-4 flex h-20 max-w-xs items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-secondary">
                Area tanda tangan mahasiswa sesuai template
              </div>
              {signature && (
                <p className="mt-3 break-all text-xs text-green-700">
                  Tanda tangan tersimpan: {signature.fileName}
                </p>
              )}
            </div>
          )}
          {!locked && (
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="submit" disabled={busy}>
                Simpan Draft
              </Button>
              <button
                type="button"
                disabled={busy || !signature}
                onClick={() => mutation.mutate({ type: 'generate' })}
                className="rounded-lg border border-border px-5 py-3 text-sm font-medium disabled:opacity-40"
              >
                {busy ? 'Memproses...' : 'Buat PDF Formulir'}
              </button>
            </div>
          )}
        </form>
      </section>
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold">Dokumen Pengajuan</h2>
        <p className="mt-2 text-sm text-secondary">
          Seluruh dokumen wajib berupa PDF. Maksimal {initial.maxDocumentSizeMb ?? 10} MB per
          dokumen.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {requiredDocuments(kind).map(({ type, label }) => {
            const document = initial.documents.find((d) => d.type === type);
            const isForm = type.endsWith('_FORM');
            return (
              <div key={type} className="rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold">{label}</h3>
                <p className="mt-2 break-all text-xs text-secondary">
                  {document
                    ? document.fileName
                    : isForm
                      ? 'Buat PDF melalui formulir di atas.'
                      : 'Belum ada dokumen.'}
                </p>
                {document && (
                  <div className="mt-4 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setPreview(document)}
                      className="text-sm text-accent"
                    >
                      Pratinjau PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void downloadDocument(kind, document).catch((e: unknown) =>
                          setFileError(authErrorMessage(e)),
                        );
                      }}
                      className="text-sm text-accent"
                    >
                      Unduh PDF
                    </button>
                  </div>
                )}
                {!locked && !isForm && (
                  <div className="mt-4">
                    <FormField
                      id={`file-${type}`}
                      label={document ? `Ganti ${label}` : `Unggah ${label}`}
                    >
                      <Input
                        id={`file-${type}`}
                        type="file"
                        accept="application/pdf,.pdf"
                        disabled={busy}
                        onChange={(e) => {
                          upload(e.target.files?.[0], type);
                          e.target.value = '';
                        }}
                      />
                    </FormField>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      {!locked && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-white p-5">
          <p className="text-sm text-secondary">
            {dirty
              ? 'Simpan atau buat ulang PDF setelah mengubah formulir.'
              : complete
                ? 'Seluruh dokumen wajib telah lengkap.'
                : 'Lengkapi semua dokumen PDF untuk mengirim pengajuan.'}
          </p>
          <Button
            disabled={busy || !complete || dirty}
            onClick={() => mutation.mutate({ type: 'submit' })}
          >
            {busy
              ? 'Memproses...'
              : initial.status === 'REJECTED'
                ? 'Kirim Ulang Pengajuan'
                : 'Kirim Pengajuan'}
          </Button>
        </div>
      )}
      {preview && <PdfPreview kind={kind} document={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
export default function StudentSubmissionPage({ kind }: { kind: SubmissionKind }) {
  const query = useQuery({ queryKey: ['submission', kind], queryFn: () => getSubmission(kind) });
  useSessionExpiry(query.error);
  return (
    <>
      <PageHeader
        title={submissionTitle(kind)}
        description={`Lengkapi formulir dan dokumen pengajuan ${submissionTitle(kind).toLowerCase()} Anda.`}
      />
      {query.isPending ? (
        <p role="status">Memuat pengajuan...</p>
      ) : query.isError ? (
        <p role="alert" className="text-error">
          {authErrorMessage(query.error)}
        </p>
      ) : (
        <SubmissionEditor key={query.data.id} initial={query.data} kind={kind} />
      )}
    </>
  );
}
