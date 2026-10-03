import { z } from 'zod';

const text = (label: string, max = 150) =>
  z
    .string({ error: `${label} harus berupa teks.` })
    .trim()
    .max(max, `${label} maksimal ${max} karakter.`)
    .default('');
export const formSchema = z
  .object({
    phone: text('Nomor Telepon', 30),
    title: text('Judul', 1000),
    promoter: text('Promotor'),
    coPromoter1: text('Co-Promotor pertama'),
    coPromoter2: text('Co-Promotor kedua'),
    program: text('Program Studi'),
    city: text('Kota', 100),
    formDate: z
      .string({ error: 'Tanggal formulir tidak valid.' })
      .default('')
      .refine(
        (v) =>
          !v ||
          (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
            !Number.isNaN(Date.parse(v)) &&
            new Date(v).toISOString().slice(0, 10) === v),
        'Tanggal formulir tidak valid.',
      ),
  })
  .strict();
export type AcademicForm = z.infer<typeof formSchema>;
export const completeFormSchema = formSchema.refine(
  (v) =>
    [v.phone, v.title, v.promoter, v.coPromoter1, v.program, v.city, v.formDate].every(Boolean),
  'Lengkapi nomor telepon, judul, pembimbing, program studi, kota, dan tanggal formulir.',
);
export const reviewSchema = z.discriminatedUnion(
  'decision',
  [
    z
      .object({ decision: z.literal('APPROVED', { error: 'Keputusan pemeriksaan tidak valid.' }) })
      .strict(),
    z
      .object({
        decision: z.literal('REJECTED', { error: 'Keputusan pemeriksaan tidak valid.' }),
        reason: z
          .string({ error: 'Alasan penolakan wajib diisi.' })
          .trim()
          .min(1, 'Alasan penolakan wajib diisi.')
          .max(2000, 'Alasan penolakan maksimal 2000 karakter.'),
      })
      .strict(),
  ],
  { error: 'Keputusan pemeriksaan tidak valid.' },
);
export const listSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(150).default(''),
    status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED']).optional(),
    sortBy: z.enum(['fullName', 'nim', 'submittedAt', 'status']).default('submittedAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();
