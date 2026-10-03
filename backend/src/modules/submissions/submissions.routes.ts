import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { resolve } from 'node:path';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { getPrisma } from '../../config/prisma.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { trustedOrigin } from '../../middleware/trusted-origin.js';
import { HttpError } from '../../utils/http-error.js';
import type { SubmissionKind } from '../../generated/prisma/client.js';
import { formSchema, listSchema, reviewSchema } from './submissions.schema.js';
import * as service from './submissions.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_DOCUMENT_SIZE_MB * 1024 * 1024, files: 1, fields: 0, parts: 1 },
}).single('file');
const receive: RequestHandler = (req, res, next) =>
  upload(req, res, (error: unknown) => {
    if (error)
      return next(
        new HttpError(
          400,
          error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
            ? `Ukuran dokumen maksimal ${env.MAX_DOCUMENT_SIZE_MB} MB.`
            : 'Unggah satu file melalui kolom file.',
        ),
      );
    if (!req.file) return next(new HttpError(400, 'Pilih file yang akan diunggah.'));
    next();
  });
function parse<T>(schema: z.ZodType<T>, value: unknown, genericMessage?: string): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(
      400,
      genericMessage ??
        (result.error.issues[0]?.path.length
          ? result.error.issues[0].message
          : 'Data permintaan tidak valid.'),
    );
  return result.data;
}
const idParam = (value: unknown) => parse(z.uuid({ error: 'ID tidak valid.' }), value);
const typeSchema = z.enum(
  [
    'PAYMENT_RECEIPT',
    'PROPOSAL_DRAFT',
    'TRANSCRIPT',
    'PUBLISHED_ARTICLE_DRAFT',
    'SIGNATURE',
    'SIGNED_PROPOSAL_FORM',
    'SIGNED_QUALIFICATION_FORM',
  ],
  { error: 'Jenis dokumen tidak valid.' },
);
export function createSubmissionRouter(kind: SubmissionKind, admin = false) {
  const router = Router();
  router.use(authenticate, authorize(admin ? 'ADMIN' : 'STUDENT'));
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  const ok = (
    res: Parameters<RequestHandler>[1],
    data: unknown,
    message = 'Data berhasil dimuat.',
  ) => res.json({ success: true, message, data });
  const fileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    keyGenerator: (_req, res) => res.locals.user!.id,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Terlalu banyak percobaan dokumen. Silakan coba kembali dalam 15 menit.',
    },
  });
  if (admin) {
    router.get('/', async (req, res) => {
      const query = parse(listSchema, req.query, 'Filter atau pengurutan pengajuan tidak valid.');
      const where = {
        kind,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              student: {
                OR: [{ nim: { contains: query.search } }, { fullName: { contains: query.search } }],
              },
            }
          : {}),
      };
      const orderBy =
        query.sortBy === 'nim' || query.sortBy === 'fullName'
          ? { student: { [query.sortBy]: query.sortOrder } }
          : { [query.sortBy]: query.sortOrder };
      const prisma = getPrisma();
      const [total, data] = await prisma.$transaction([
        prisma.submission.count({ where }),
        prisma.submission.findMany({
          where,
          orderBy: [orderBy, { id: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          include: { student: { select: { id: true, nim: true, fullName: true } } },
        }),
      ]);
      res.json({
        success: true,
        data,
        meta: {
          page: query.page,
          limit: query.limit,
          total,
          totalPages: Math.ceil(total / query.limit),
        },
      });
    });
    router.get('/:id', async (req, res) =>
      ok(res, await service.getDetail(idParam(req.params.id), kind)),
    );
    router.patch('/:id/review', trustedOrigin, async (req, res) =>
      ok(
        res,
        await service.review(
          idParam(req.params.id),
          kind,
          res.locals.user!.id,
          parse(reviewSchema, req.body),
        ),
        'Pengajuan berhasil diperiksa.',
      ),
    );
  } else {
    router.get('/me', async (_req, res) =>
      ok(res, {
        ...(await service.getMine(res.locals.user!.id, kind)),
        maxDocumentSizeMb: env.MAX_DOCUMENT_SIZE_MB,
      }),
    );
    router.patch('/me', trustedOrigin, async (req, res) =>
      ok(
        res,
        await service.saveDraft(res.locals.user!.id, kind, parse(formSchema, req.body)),
        'Draft berhasil disimpan.',
      ),
    );
    router.post('/me/generate', trustedOrigin, fileLimiter, async (_req, res) =>
      ok(
        res,
        await service.generatePdf(res.locals.user!.id, kind),
        'PDF formulir berhasil dibuat.',
      ),
    );
    router.post('/me/submit', trustedOrigin, async (_req, res) =>
      ok(res, await service.submit(res.locals.user!.id, kind), 'Pengajuan berhasil dikirim.'),
    );
    router.post('/me/documents/:type', trustedOrigin, fileLimiter, receive, async (req, res) =>
      ok(
        res,
        await service.uploadDocument(
          res.locals.user!.id,
          kind,
          parse(typeSchema, req.params.type),
          req.file!,
        ),
        'Dokumen berhasil diunggah.',
      ),
    );
  }
  router.get(
    admin ? '/:id/documents/:documentId' : '/me/documents/:documentId',
    async (req, res, next) => {
      const own = admin ? undefined : res.locals.user!.id;
      const submissionId = admin
        ? idParam((req.params as Record<string, string>).id)
        : (await service.getMine(own!, kind)).id;
      const document = await service.getDocument(
        submissionId,
        kind,
        idParam(req.params.documentId),
        own,
      );
      res.set({
        'Content-Type': document.mimeType,
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${document.fileName.replace(/["\r\n]/g, '_')}"`,
      });
      res.sendFile(resolve(service.uploadRoot, document.filePath), (error) => {
        if (error) next(new HttpError(404, 'File dokumen tidak tersedia.'));
      });
    },
  );
  return router;
}
