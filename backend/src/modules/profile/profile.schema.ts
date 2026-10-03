import { z } from 'zod';
import { accountPasswordSchema } from '../auth/auth.schema.js';

export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: 'Password saat ini wajib diisi.' }).min(1, 'Password saat ini wajib diisi.').refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password saat ini maksimal 72 byte.'),
  newPassword: accountPasswordSchema,
  confirmPassword: z.string({ error: 'Konfirmasi password wajib diisi.' }).min(1, 'Konfirmasi password wajib diisi.').refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Konfirmasi password maksimal 72 byte.'),
}).strict().refine((input) => input.newPassword === input.confirmPassword, { message: 'Konfirmasi password tidak sesuai.', path: ['confirmPassword'] }).refine((input) => input.newPassword !== input.currentPassword, { message: 'Password baru harus berbeda dari password saat ini.', path: ['newPassword'] });
