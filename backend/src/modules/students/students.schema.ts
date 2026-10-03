import { z } from 'zod';
import { accountPasswordSchema, nimSchema } from '../auth/auth.schema.js';

const todayInJakarta = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const profileFields = {
  fullName: z.string({ error: 'Nama lengkap wajib diisi.' }).trim().min(1, 'Nama lengkap wajib diisi.').max(150, 'Nama lengkap maksimal 150 karakter.'),
  gender: z.enum(['MALE', 'FEMALE'], { error: 'Silakan pilih jenis kelamin.' }),
  address: z.string({ error: 'Alamat wajib diisi.' }).trim().min(1, 'Alamat wajib diisi.').max(1000, 'Alamat maksimal 1000 karakter.'),
  birthDate: z.iso.date({ error: 'Tanggal lahir tidak valid.' }).refine((value) => value >= '1900-01-01' && value <= todayInJakarta(), 'Tanggal lahir harus antara 1 Januari 1900 dan hari ini.'),
};

export const createStudentSchema = z.object({
  nim: nimSchema,
  ...profileFields,
  password: accountPasswordSchema,
}).strict();

export const studentListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).default(''),
  sortBy: z.enum(['nim', 'fullName', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
}).refine((data) => !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo, {
  message: 'Tanggal akhir harus sama atau setelah tanggal awal.', path: ['dateTo'],
});

export const studentIdSchema = z.string().uuid();
export const updateStudentSchema = z.object({
  nim: nimSchema,
  ...z.object(profileFields).partial().shape,
  password: accountPasswordSchema.optional(),
}).strict();
