import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { env } from '../../config/env.js';
import { getPrisma } from '../../config/prisma.js';
import type { Prisma, SubmissionKind, DocumentType } from '../../generated/prisma/client.js';
import { HttpError } from '../../utils/http-error.js';
import { completeFormSchema, formSchema, type AcademicForm } from './submissions.schema.js';
import { generateFormPdf } from './submissions.pdf.js';

export const uploadRoot = resolve(
  fileURLToPath(new URL('../../../', import.meta.url)),
  env.UPLOAD_DIR,
);
export const requirements: Record<SubmissionKind, DocumentType[]> = {
  PROPOSAL: [
    'PROPOSAL_FORM',
    'SIGNED_PROPOSAL_FORM',
    'PAYMENT_RECEIPT',
    'PROPOSAL_DRAFT',
    'TRANSCRIPT',
  ],
  QUALIFICATION: ['QUALIFICATION_FORM', 'SIGNED_QUALIFICATION_FORM', 'PUBLISHED_ARTICLE_DRAFT'],
};
export const formType = (kind: SubmissionKind): DocumentType =>
  kind === 'PROPOSAL' ? 'PROPOSAL_FORM' : 'QUALIFICATION_FORM';
export const signedFormType = (kind: SubmissionKind): DocumentType =>
  kind === 'PROPOSAL' ? 'SIGNED_PROPOSAL_FORM' : 'SIGNED_QUALIFICATION_FORM';
const documentLabels: Record<DocumentType, string> = {
  PROPOSAL_FORM: 'Formulir Proposal hasil generate',
  SIGNED_PROPOSAL_FORM: 'Formulir Proposal Bertanda Tangan Persetujuan',
  QUALIFICATION_FORM: 'Form Kualifikasi hasil generate',
  SIGNED_QUALIFICATION_FORM: 'Form Kualifikasi Bertanda Tangan Persetujuan',
  PAYMENT_RECEIPT: 'Kuitansi Pembayaran',
  PROPOSAL_DRAFT: 'Draft Proposal',
  TRANSCRIPT: 'Transkrip Nilai',
  PUBLISHED_ARTICLE_DRAFT: 'Draft Artikel yang Dipublikasikan',
  SIGNATURE: 'Tanda Tangan Mahasiswa',
};
async function invalidateForms(
  tx: Prisma.TransactionClient,
  submission: { documents: { id: string; type: DocumentType; filePath: string }[] },
  kind: SubmissionKind,
  obsolete: string[],
  includeGenerated = true,
) {
  const types = includeGenerated ? [formType(kind), signedFormType(kind)] : [signedFormType(kind)];
  const old = submission.documents.filter((d) => types.includes(d.type));
  if (old.length) {
    await tx.submissionDocument.deleteMany({ where: { id: { in: old.map((d) => d.id) } } });
    obsolete.push(...old.map((d) => d.filePath));
  }
}
const include = {
  documents: true,
  student: { select: { id: true, nim: true, fullName: true, gender: true, address: true } },
} as const;
export function publicSubmission<T extends { documents: { filePath: string }[] }>(submission: T) {
  return {
    ...submission,
    documents: submission.documents.map((document) => {
      const copy: Partial<typeof document> = { ...document };
      delete copy.filePath;
      return copy;
    }),
  };
}
export async function getMine(studentId: string, kind: SubmissionKind) {
  const prisma = getPrisma();
  const submission = await prisma.submission.upsert({
    where: { studentId_kind: { studentId, kind } },
    create: {
      studentId,
      kind,
      formData: formSchema.parse({ program: 'Doktor Ilmu Komputer', city: 'Salatiga' }),
    },
    update: {},
    include,
  });
  return publicSubmission(submission);
}
async function lock(tx: Prisma.TransactionClient, studentId: string, kind: SubmissionKind) {
  const found = await tx.submission.findUnique({
    where: { studentId_kind: { studentId, kind } },
    select: { id: true },
  });
  if (!found) throw new HttpError(404, 'Pengajuan tidak ditemukan. Muat kembali halaman.');
  await tx.$queryRaw`SELECT id FROM Submission WHERE id = ${found.id} FOR UPDATE`;
  const submission = await tx.submission.findUniqueOrThrow({ where: { id: found.id }, include });
  if (submission.status !== 'DRAFT' && submission.status !== 'REJECTED')
    throw new HttpError(
      409,
      'Pengajuan menunggu pemeriksaan atau sudah disetujui. Data tidak dapat diubah.',
    );
  return submission;
}
export async function removeFile(path: string) {
  try {
    await unlink(resolve(uploadRoot, path));
  } catch (error) {
    if (!(
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ))
      console.error('Gagal membersihkan dokumen lama.', error);
  }
}
export async function saveDraft(studentId: string, kind: SubmissionKind, form: AcademicForm) {
  const obsolete: string[] = [];
  const result = await getPrisma().$transaction(
    async (tx) => {
      const submission = await lock(tx, studentId, kind);
      if (JSON.stringify(formSchema.parse(submission.formData)) !== JSON.stringify(form)) {
        await invalidateForms(tx, submission, kind, obsolete);
      }
      return tx.submission.update({
        where: { id: submission.id },
        data: { formData: form },
        include,
      });
    },
    { isolationLevel: 'ReadCommitted' },
  );
  await Promise.all(obsolete.map(removeFile));
  return publicSubmission(result);
}
export async function validatePdf(buffer: Buffer) {
  if (buffer.subarray(0, 5).toString() !== '%PDF-')
    throw new HttpError(400, 'Dokumen harus berupa PDF yang valid.');
  try {
    const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
    if (!pdf.getPageCount() || pdf.getPageCount() > 1000) throw new Error('pages');
  } catch {
    throw new HttpError(400, 'PDF tidak valid, terenkripsi, atau tidak dapat dibaca.');
  }
}
async function validateSignature(buffer: Buffer) {
  try {
    const image = sharp(buffer, { limitInputPixels: 4_000_000 });
    const meta = await image.metadata();
    if (meta.format !== 'png' || !meta.hasAlpha || (meta.pages ?? 1) !== 1)
      throw new Error('format');
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = false;
    let visible = false;
    for (let i = 3; i < data.length; i += info.channels) {
      if (data[i]! < 255) transparent = true;
      if (data[i]! > 0) visible = true;
    }
    if (!transparent || !visible) throw new Error('alpha');
    return await sharp(buffer).png().toBuffer();
  } catch {
    throw new HttpError(
      400,
      'Tanda tangan harus PNG transparan, tidak kosong, dan maksimal 4 juta piksel.',
    );
  }
}
export async function uploadDocument(
  studentId: string,
  kind: SubmissionKind,
  type: DocumentType,
  file: Express.Multer.File,
) {
  if (type !== 'SIGNATURE' && (!requirements[kind].includes(type) || type === formType(kind)))
    throw new HttpError(400, 'Jenis dokumen tidak sesuai. Formulir wajib dibuat melalui aplikasi.');
  if (
    type === 'SIGNATURE'
      ? file.mimetype !== 'image/png' || !/\.png$/i.test(file.originalname)
      : file.mimetype !== 'application/pdf' || !/\.pdf$/i.test(file.originalname)
  )
    throw new HttpError(
      400,
      type === 'SIGNATURE'
        ? 'Tanda tangan harus berformat PNG transparan.'
        : 'Dokumen harus berformat PDF.',
    );
  let buffer = file.buffer;
  if (type === 'SIGNATURE') {
    if (buffer.length > 2 * 1024 * 1024) throw new HttpError(400, 'Tanda tangan maksimal 2 MB.');
    buffer = await validateSignature(buffer);
  } else await validatePdf(buffer);
  const path = randomUUID() + (type === 'SIGNATURE' ? '.png' : '.pdf');
  await mkdir(uploadRoot, { recursive: true });
  const obsolete: string[] = [];
  try {
    const result = await getPrisma().$transaction(
      async (tx) => {
        const submission = await lock(tx, studentId, kind);
        if (
          type === signedFormType(kind) &&
          !submission.documents.some((d) => d.type === formType(kind))
        )
          throw new HttpError(
            400,
            'Buat dan unduh PDF formulir terlebih dahulu sebelum mengunggah formulir bertanda tangan persetujuan.',
          );
        const old = submission.documents.find((d) => d.type === type);
        if (old) obsolete.push(old.filePath);
        if (type === 'SIGNATURE') {
          await invalidateForms(tx, submission, kind, obsolete);
        }
        await writeFile(resolve(uploadRoot, path), buffer, { flag: 'wx' });
        const metadata = {
          fileName: file.originalname.replace(/[^a-zA-Z0-9 ._()-]/g, '_').slice(0, 200),
          filePath: path,
          mimeType: type === 'SIGNATURE' ? 'image/png' : 'application/pdf',
          fileSize: buffer.length,
        };
        await tx.submissionDocument.upsert({
          where: { submissionId_type: { submissionId: submission.id, type } },
          create: { submissionId: submission.id, type, ...metadata },
          update: metadata,
        });
        return tx.submission.findUniqueOrThrow({ where: { id: submission.id }, include });
      },
      { timeout: 15000, isolationLevel: 'ReadCommitted' },
    );
    await Promise.all(obsolete.map(removeFile));
    return publicSubmission(result);
  } catch (error) {
    await removeFile(path);
    throw error;
  }
}
export async function generatePdf(studentId: string, kind: SubmissionKind) {
  const path = randomUUID() + '.pdf';
  const obsolete: string[] = [];
  await mkdir(uploadRoot, { recursive: true });
  try {
    const result = await getPrisma().$transaction(
      async (tx) => {
        const submission = await lock(tx, studentId, kind);
        const parsed = completeFormSchema.safeParse(submission.formData);
        if (!parsed.success)
          throw new HttpError(400, 'Lengkapi seluruh data formulir sebelum membuat PDF.');
        if (
          !submission.student.fullName ||
          !submission.student.nim ||
          !submission.student.address ||
          !submission.student.gender
        )
          throw new HttpError(400, 'Lengkapi profil mahasiswa terlebih dahulu.');
        const signature = submission.documents.find((d) => d.type === 'SIGNATURE');
        if (!signature)
          throw new HttpError(400, 'Unggah PNG tanda tangan transparan sebelum membuat PDF.');
        let buffer: Buffer;
        try {
          buffer = await generateFormPdf(
            kind,
            parsed.data,
            submission.student,
            await readFile(resolve(uploadRoot, signature.filePath)),
          );
        } catch (error) {
          if (error instanceof HttpError) throw error;
          throw new HttpError(
            400,
            'Gagal membuat PDF formulir. Periksa data dan tanda tangan, lalu coba kembali.',
          );
        }
        await writeFile(resolve(uploadRoot, path), buffer, { flag: 'wx' });
        await invalidateForms(tx, submission, kind, obsolete, false);
        const type = formType(kind);
        const old = submission.documents.find((d) => d.type === type);
        if (old) obsolete.push(old.filePath);
        const metadata = {
          fileName: kind === 'PROPOSAL' ? 'Formulir-Proposal.pdf' : 'Formulir-Kualifikasi.pdf',
          filePath: path,
          mimeType: 'application/pdf',
          fileSize: buffer.length,
        };
        await tx.submissionDocument.upsert({
          where: { submissionId_type: { submissionId: submission.id, type } },
          create: { submissionId: submission.id, type, ...metadata },
          update: metadata,
        });
        return tx.submission.findUniqueOrThrow({ where: { id: submission.id }, include });
      },
      { timeout: 15000, isolationLevel: 'ReadCommitted' },
    );
    await Promise.all(obsolete.map(removeFile));
    return publicSubmission(result);
  } catch (error) {
    await removeFile(path);
    throw error;
  }
}
export async function submit(studentId: string, kind: SubmissionKind) {
  return publicSubmission(
    await getPrisma().$transaction(
      async (tx) => {
        const submission = await lock(tx, studentId, kind);
        if (!completeFormSchema.safeParse(submission.formData).success)
          throw new HttpError(400, 'Data formulir belum lengkap.');
        const missing = requirements[kind].filter(
          (type) =>
            !submission.documents.some((d) => d.type === type && d.mimeType === 'application/pdf'),
        );
        if (missing.length)
          throw new HttpError(
            400,
            'Dokumen yang belum lengkap: ' +
              missing.map((type) => documentLabels[type]).join(', ') +
              '.',
          );
        for (const type of requirements[kind]) {
          const document = submission.documents.find((d) => d.type === type);
          if (!document || document.mimeType !== 'application/pdf')
            throw new HttpError(
              400,
              'Lengkapi semua dokumen PDF wajib sebelum mengirim pengajuan.',
            );
          try {
            await validatePdf(await readFile(resolve(uploadRoot, document.filePath)));
          } catch {
            throw new HttpError(
              400,
              `${documentLabels[type]} tidak tersedia atau tidak valid. Unggah kembali dokumen tersebut.`,
            );
          }
        }
        return tx.submission.update({
          where: { id: submission.id },
          data: {
            status: 'PENDING',
            submittedAt: new Date(),
            approvedAt: null,
            rejectedAt: null,
            rejectionReason: null,
            reviewedBy: null,
          },
          include,
        });
      },
      { timeout: 15000, isolationLevel: 'ReadCommitted' },
    ),
  );
}
export async function review(
  id: string,
  kind: SubmissionKind,
  adminId: string,
  input: { decision: 'APPROVED' | 'REJECTED'; reason?: string },
) {
  return publicSubmission(
    await getPrisma().$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM Submission WHERE id = ${id} FOR UPDATE`;
        const current = await tx.submission.findFirst({ where: { id, kind } });
        if (!current) throw new HttpError(404, 'Pengajuan tidak ditemukan.');
        if (current.status !== 'PENDING')
          throw new HttpError(
            409,
            'Hanya pengajuan yang menunggu pemeriksaan dapat disetujui atau ditolak.',
          );
        return tx.submission.update({
          where: { id },
          data: {
            status: input.decision,
            reviewedBy: adminId,
            approvedAt: input.decision === 'APPROVED' ? new Date() : null,
            rejectedAt: input.decision === 'REJECTED' ? new Date() : null,
            rejectionReason: input.decision === 'REJECTED' ? input.reason : null,
          },
          include,
        });
      },
      { isolationLevel: 'ReadCommitted' },
    ),
  );
}
export async function getDetail(id: string, kind: SubmissionKind) {
  const submission = await getPrisma().submission.findFirst({ where: { id, kind }, include });
  if (!submission) throw new HttpError(404, 'Pengajuan tidak ditemukan.');
  return publicSubmission(submission);
}
export async function getDocument(
  id: string,
  kind: SubmissionKind,
  documentId: string,
  studentId?: string,
) {
  const document = await getPrisma().submissionDocument.findFirst({
    where: { id: documentId, submission: { id, kind, ...(studentId ? { studentId } : {}) } },
  });
  if (!document) throw new HttpError(404, 'Dokumen tidak ditemukan.');
  return document;
}
