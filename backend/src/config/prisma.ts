import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from './env.js';
import { HttpError } from '../utils/http-error.js';

let prisma: PrismaClient | undefined;

export function getPrisma() {
  if (!env.DATABASE_URL) {
    throw new HttpError(503, 'Layanan masuk belum tersedia. Silakan coba kembali.');
  }
  prisma ??= new PrismaClient({ adapter: new PrismaMariaDb(env.DATABASE_URL) });
  return prisma;
}

export async function disconnectPrisma() {
  await prisma?.$disconnect();
}
