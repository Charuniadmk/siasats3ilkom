import { z } from 'zod';
import { accountPasswordSchema, nimSchema } from '../auth/auth.schema.js';

export const createStudentSchema = z.object({
  nim: nimSchema,
  password: accountPasswordSchema,
}).strict();

export const studentListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(32).default(''),
});
