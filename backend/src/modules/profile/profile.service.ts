import { compare, hash } from 'bcrypt';
import type { z } from 'zod';
import { getPrisma } from '../../config/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import type { changePasswordSchema } from './profile.schema.js';

export async function changeStudentPassword(userId: string, input: z.infer<typeof changePasswordSchema>) {
  const prisma = getPrisma();
  const user = await prisma.user.findFirst({ where: { id: userId, role: 'STUDENT' }, select: { passwordHash: true, sessionVersion: true } });
  if (!user) throw new HttpError(404, 'Akun mahasiswa tidak ditemukan.');
  if (!await compare(input.currentPassword, user.passwordHash)) throw new HttpError(400, 'Password saat ini tidak sesuai.');
  const result = await prisma.user.updateMany({
    where: { id: userId, role: 'STUDENT', passwordHash: user.passwordHash, sessionVersion: user.sessionVersion },
    data: { passwordHash: await hash(input.newPassword, 12), sessionVersion: { increment: 1 } },
  });
  if (result.count !== 1) throw new HttpError(409, 'Akun telah berubah. Silakan masuk kembali dan coba lagi.');
}
