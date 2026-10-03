import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.string().startsWith('mysql://').optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().min(32).optional(),
  ),
  JWT_EXPIRES_IN: z.string().regex(/^[1-9]\d*[mhd]$/).default('1d'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(`Konfigurasi environment tidak valid: ${fields}.`);
}

export const env = result.data;
