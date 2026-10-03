import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../../components/common/PageHeader';
import PdfPreview from '../../components/common/PdfPreview';
import DataTable, { type TableSort } from '../../components/ui/DataTable';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Textarea from '../../components/ui/Textarea';
import FormField from '../../components/forms/FormField';
import SubmissionBadge from '../../components/ui/SubmissionBadge';
import { authErrorMessage } from '../auth/auth-api';
import { useSessionExpiry } from '../auth/use-session-expiry';
import {
  listSubmissions,
  getSubmission,
  reviewSubmission,
  submissionTitle,
  statusLabels,
  requiredDocuments,
  downloadDocument,
  type SubmissionKind,
  type SubmissionDocument,
} from './submissions-api';

export function AdminSubmissionList({ kind }: { kind: SubmissionKind }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<TableSort>({ key: 'submittedAt', direction: 'desc' });
  const [selected, setSelected] = useState<string[]>([]);
  const params = {
    search,
    status: status || undefined,
    page,
    limit,
    sortBy: sort.key,
    sortOrder: sort.direction,
  };
  const query = useQuery({
    queryKey: ['submission-list', kind, params],
    queryFn: () => listSubmissions(kind, params),
  });
  useSessionExpiry(query.error);
  const root = kind === 'PROPOSAL' ? '/admin/proposals' : '/admin/qualifications';
  return (
    <>
      <PageHeader
        title={`Pengajuan ${submissionTitle(kind)}`}
        description="Periksa dokumen dan tindak lanjuti pengajuan mahasiswa."
      />
      <section className="rounded-2xl border border-border bg-white shadow-sm">
        <div className="grid gap-4 border-b border-border p-5 sm:grid-cols-2">
          <FormField id="submission-search" label="Cari Mahasiswa">
            <Input
              id="submission-search"
              placeholder="Cari nama atau NIM mahasiswa..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                setSelected([]);
              }}
            />
          </FormField>
          <FormField id="submission-status" label="Filter Status">
            <Select
              id="submission-status"
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
                setSelected([]);
              }}
              options={[
                { value: '', label: 'Semua' },
                ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
              ]}
            />
          </FormField>
        </div>
        <DataTable
          caption={`Daftar pengajuan ${submissionTitle(kind).toLowerCase()}`}
          columns={[
            {
              key: 'fullName',
              header: 'Nama Mahasiswa',
              sortable: true,
              render: (s) => s.student.fullName ?? 'Belum dilengkapi',
            },
            { key: 'nim', header: 'NIM', sortable: true, render: (s) => s.student.nim },
            {
              key: 'submittedAt',
              header: 'Tanggal Pengajuan',
              sortable: true,
              render: (s) =>
                s.submittedAt ? new Date(s.submittedAt).toLocaleString('id-ID') : 'Belum diajukan',
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (s) => <SubmissionBadge status={s.status} />,
            },
            {
              key: 'action',
              header: 'Tindakan',
              render: (s) => (
                <Link to={`${root}/${s.id}`} className="text-accent">
                  Lihat Detail
                </Link>
              ),
            },
          ]}
          data={query.data?.data ?? []}
          getRowId={(s) => s.id}
          getRowLabel={(s) => s.student.fullName ?? s.student.nim ?? s.id}
          sort={sort}
          onSortChange={(value) => {
            setSort(value);
            setPage(1);
            setSelected([]);
          }}
          selectedIds={selected}
          onSelectionChange={setSelected}
          meta={query.data?.meta}
          onPageChange={(value) => {
            setPage(value);
            setSelected([]);
          }}
          onPageSizeChange={(value) => {
            setLimit(value);
            setPage(1);
            setSelected([]);
          }}
          loading={query.isPending}
          error={query.isError ? authErrorMessage(query.error) : undefined}
          onRetry={() => {
            void query.refetch();
          }}
          emptyMessage="Belum ada pengajuan yang sesuai."
        />
      </section>
    </>
  );
}
export function AdminSubmissionDetail({ kind }: { kind: SubmissionKind }) {
  const { id = '' } = useParams();
  const client = useQueryClient();
  const key = ['submission-detail', kind, id];
  const query = useQuery({ queryKey: key, queryFn: () => getSubmission(kind, id) });
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [preview, setPreview] = useState<SubmissionDocument | null>(null);
  const [notice, setNotice] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const mutation = useMutation({
    mutationFn: () => reviewSubmission(kind, id, decision!, reason),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      void client.invalidateQueries({ queryKey: ['submission-list', kind] });
      setDecision(null);
      setNotice('Pengajuan berhasil diperiksa.');
    },
  });
  useSessionExpiry(query.error);
  useSessionExpiry(mutation.error);
  const root = kind === 'PROPOSAL' ? '/admin/proposals' : '/admin/qualifications';
  if (query.isPending) return <p role="status">Memuat pengajuan...</p>;
  if (query.isError)
    return (
      <p role="alert" className="text-error">
        {authErrorMessage(query.error)}
      </p>
    );
  const submission = query.data;
  const labels: Record<string, string> = {
    phone: 'Nomor Telepon',
    title: kind === 'PROPOSAL' ? 'Judul Disertasi' : 'Judul Artikel',
    promoter: 'Promotor',
    coPromoter1: 'Co-Promotor 1',
    coPromoter2: 'Co-Promotor 2',
    program: 'Program Studi',
    city: 'Kota',
    formDate: 'Tanggal Formulir',
  };
  return (
    <>
      <PageHeader
        title={`Detail ${submissionTitle(kind)}`}
        description="Tinjau data mahasiswa dan seluruh dokumen sebelum mengambil keputusan."
      />
      <Link to={root} className="mb-5 inline-block text-sm text-accent">
        Kembali ke Daftar Pengajuan
      </Link>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SubmissionBadge status={submission.status} />
          {submission.status === 'PENDING' && (
            <div className="flex gap-3">
              <button
                className="rounded-lg border border-red-200 px-5 py-3 text-sm text-error"
                onClick={() => {
                  setDecision('REJECTED');
                  setReason('');
                  setReasonError('');
                  mutation.reset();
                }}
              >
                Tolak
              </button>
              <Button
                onClick={() => {
                  setDecision('APPROVED');
                  mutation.reset();
                }}
              >
                Setujui
              </Button>
            </div>
          )}
        </div>
        {notice && (
          <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {notice}
          </p>
        )}
        {submission.rejectionReason && (
          <div className="rounded-xl bg-red-50 p-5">
            <h2 className="font-semibold">Alasan Penolakan</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{submission.rejectionReason}</p>
          </div>
        )}
        <section className="rounded-2xl border border-border bg-white p-6">
          <h2 className="text-lg font-semibold">Data Mahasiswa</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ['Nama Lengkap', submission.student.fullName],
              ['NIM', submission.student.nim],
              ['Alamat', submission.student.address],
              [
                'Tanggal Pengajuan',
                submission.submittedAt
                  ? new Date(submission.submittedAt).toLocaleString('id-ID')
                  : 'Belum diajukan',
              ],
              [
                'Tanggal Persetujuan',
                submission.approvedAt
                  ? new Date(submission.approvedAt).toLocaleString('id-ID')
                  : '-',
              ],
              [
                'Tanggal Penolakan',
                submission.rejectedAt
                  ? new Date(submission.rejectedAt).toLocaleString('id-ID')
                  : '-',
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-secondary">{label}</dt>
                <dd className="mt-1 break-words text-sm">{value || '-'}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl border border-border bg-white p-6">
          <h2 className="text-lg font-semibold">Data {submissionTitle(kind)}</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {Object.entries(submission.formData).map(([field, value]) => (
              <div key={field}>
                <dt className="text-xs text-secondary">{labels[field]}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-sm">{value || '-'}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl border border-border bg-white p-6">
          <h2 className="text-lg font-semibold">Dokumen Pengajuan</h2>
          <p className="mt-2 text-sm text-secondary">
            Periksa semua lampiran dan pastikan formulir persetujuan telah ditandatangani oleh
            penyetuju.
          </p>
          {downloadError && (
            <p role="alert" className="mt-3 text-error">
              {downloadError}
            </p>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ...requiredDocuments(kind),
              ...submission.documents
                .filter(
                  (document) =>
                    !requiredDocuments(kind).some((required) => required.type === document.type),
                )
                .map((document) => ({
                  type: document.type,
                  label:
                    document.type === 'SIGNATURE' ? 'Tanda Tangan Mahasiswa' : 'Dokumen Tambahan',
                })),
            ].map(({ type, label }) => {
              const document = submission.documents.find((d) => d.type === type);
              return (
                <div key={type} className="rounded-xl border border-border p-5">
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <p className="mt-2 break-all text-xs text-secondary">
                    {document?.fileName ?? 'Belum tersedia'}
                  </p>
                  {document && (
                    <div className="mt-4 flex gap-4">
                      <button className="text-sm text-accent" onClick={() => setPreview(document)}>
                        {document.mimeType === 'application/pdf'
                          ? 'Pratinjau PDF'
                          : 'Pratinjau Tanda Tangan'}
                      </button>
                      <button
                        className="text-sm text-accent"
                        onClick={() => {
                          void downloadDocument(kind, document, id).catch((e: unknown) =>
                            setDownloadError(authErrorMessage(e)),
                          );
                        }}
                      >
                        {document.mimeType === 'application/pdf'
                          ? 'Unduh PDF'
                          : 'Unduh Tanda Tangan'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {preview && (
        <PdfPreview
          kind={kind}
          document={preview}
          submissionId={id}
          onClose={() => setPreview(null)}
        />
      )}
      {decision && (
        <Modal
          title={decision === 'APPROVED' ? 'Setujui Pengajuan' : 'Tolak Pengajuan'}
          busy={mutation.isPending}
          onClose={() => setDecision(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (decision === 'REJECTED' && !reason.trim()) {
                setReasonError('Alasan penolakan wajib diisi.');
                return;
              }
              mutation.mutate();
            }}
          >
            <p className="mb-5 text-sm">
              {decision === 'APPROVED'
                ? `Apakah Anda yakin ingin menyetujui pengajuan ${submissionTitle(kind).toLowerCase()} ini?`
                : 'Tuliskan alasan penolakan agar mahasiswa dapat memperbaiki pengajuan.'}
            </p>
            {decision === 'REJECTED' && (
              <FormField id="rejection-reason" label="Alasan Penolakan *" error={reasonError}>
                <Textarea
                  id="rejection-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setReasonError('');
                  }}
                  maxLength={2000}
                  rows={4}
                  disabled={mutation.isPending}
                />
              </FormField>
            )}
            {mutation.isError && (
              <p role="alert" className="mt-4 text-sm text-error">
                {authErrorMessage(mutation.error)}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => setDecision(null)}
                className="rounded-lg border border-border px-5 py-3 text-sm"
              >
                Batal
              </button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? 'Memproses...'
                  : decision === 'APPROVED'
                    ? 'Setujui'
                    : 'Tolak Pengajuan'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
