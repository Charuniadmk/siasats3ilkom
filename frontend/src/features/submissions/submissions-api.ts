import { api } from '../../lib/api';
export type SubmissionKind = 'PROPOSAL' | 'QUALIFICATION';
export type SubmissionStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
export interface AcademicForm {
  phone: string;
  title: string;
  promoter: string;
  coPromoter1: string;
  coPromoter2: string;
  program: string;
  city: string;
  formDate: string;
}
export interface SubmissionDocument {
  id: string;
  type: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  updatedAt: string;
}
export interface Submission {
  id: string;
  kind: SubmissionKind;
  status: SubmissionStatus;
  formData: AcademicForm;
  documents: SubmissionDocument[];
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  maxDocumentSizeMb?: number;
  student: {
    id: string;
    nim: string | null;
    fullName: string | null;
    gender?: string;
    address?: string;
  };
}
export const basePath = (kind: SubmissionKind, admin = false) =>
  (admin ? '/admin' : '') + (kind === 'PROPOSAL' ? '/proposals' : '/qualifications');
export const submissionTitle = (kind: SubmissionKind) =>
  kind === 'PROPOSAL' ? 'Proposal' : 'Kualifikasi';
export const statusLabels: Record<SubmissionStatus, string> = {
  DRAFT: 'Draft',
  PENDING: 'Menunggu Pemeriksaan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};
export const requiredDocuments = (kind: SubmissionKind) =>
  kind === 'PROPOSAL'
    ? [
        { type: 'PROPOSAL_FORM', label: 'Formulir Proposal' },
        { type: 'SIGNED_PROPOSAL_FORM', label: 'Formulir Proposal Bertanda Tangan Persetujuan' },
        { type: 'PAYMENT_RECEIPT', label: 'Kuitansi Pembayaran' },
        { type: 'PROPOSAL_DRAFT', label: 'Draft Proposal' },
        { type: 'TRANSCRIPT', label: 'Transkrip Nilai' },
      ]
    : [
        { type: 'QUALIFICATION_FORM', label: 'Form Kualifikasi' },
        {
          type: 'SIGNED_QUALIFICATION_FORM',
          label: 'Form Kualifikasi Bertanda Tangan Persetujuan',
        },
        { type: 'PUBLISHED_ARTICLE_DRAFT', label: 'Draft Artikel yang Dipublikasikan' },
      ];
export async function getSubmission(kind: SubmissionKind, id?: string) {
  const { data } = await api.get<{ data: Submission }>(
    basePath(kind, Boolean(id)) + (id ? '/' + id : '/me'),
  );
  return data.data;
}
export async function saveSubmission(kind: SubmissionKind, form: AcademicForm) {
  const { data } = await api.patch<{ data: Submission }>(basePath(kind) + '/me', form);
  return data.data;
}
export async function submissionAction(kind: SubmissionKind, action: 'generate' | 'submit') {
  const { data } = await api.post<{ data: Submission }>(basePath(kind) + '/me/' + action, {});
  return data.data;
}
export async function uploadSubmissionFile(kind: SubmissionKind, type: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  const { data } = await api.post<{ data: Submission }>(
    basePath(kind) + '/me/documents/' + type,
    body,
  );
  return data.data;
}
export async function fetchDocument(
  kind: SubmissionKind,
  document: SubmissionDocument,
  id?: string,
) {
  const response = await api.get<Blob>(
    basePath(kind, Boolean(id)) + (id ? '/' + id : '/me') + '/documents/' + document.id,
    { responseType: 'blob' },
  );
  return response.data;
}
export async function downloadDocument(
  kind: SubmissionKind,
  document: SubmissionDocument,
  id?: string,
) {
  const blob = await fetchDocument(kind, document, id);
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = document.fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export interface SubmissionList {
  data: Submission[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export async function listSubmissions(kind: SubmissionKind, params: object) {
  const { data } = await api.get<SubmissionList>(basePath(kind, true), { params });
  return data;
}
export async function reviewSubmission(
  kind: SubmissionKind,
  id: string,
  decision: 'APPROVED' | 'REJECTED',
  reason?: string,
) {
  const { data } = await api.patch<{ data: Submission }>(
    basePath(kind, true) + '/' + id + '/review',
    decision === 'REJECTED' ? { decision, reason } : { decision },
  );
  return data.data;
}
