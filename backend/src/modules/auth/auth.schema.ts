import { z } from 'zod';

const password = z.string({ error: 'Password wajib diisi.' })
  .min(1, 'Password wajib diisi.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password maksimal 72 byte.');

export const usernameSchema = z.string({ error: 'Username wajib diisi.' })
  .trim().min(1, 'Username wajib diisi.').max(64, 'Username maksimal 64 karakter.')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung.')
  .transform((value) => value.toLowerCase());

export const nimSchema = z.string({ error: 'NIM wajib diisi.' })
  .trim().min(1, 'NIM wajib diisi.').max(32, 'NIM maksimal 32 karakter.')
  .regex(/^\d+$/, 'NIM hanya boleh berisi angka.');

export const loginSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('ADMIN'), username: usernameSchema, password }),
  z.object({ role: z.literal('STUDENT'), nim: nimSchema, password }),
]);

export const accountPasswordSchema = password.min(8, 'Password minimal 8 karakter.');
export type LoginInput = z.infer<typeof loginSchema>;
