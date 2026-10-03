import { hash } from 'bcrypt';
import type { z } from 'zod';
import { getPrisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { HttpError } from '../../utils/http-error.js';
import type { createStudentSchema, studentListSchema } from './students.schema.js';

const accountSelect = { id: true, nim: true, createdAt: true } as const;

export async function createStudent(input: z.infer<typeof createStudentSchema>) {
  try {
    return await getPrisma().user.create({
      data: { role: 'STUDENT', nim: input.nim, passwordHash: await hash(input.password, 12) },
      select: accountSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new HttpError(409, 'NIM sudah digunakan oleh akun mahasiswa lain.');
    }
    throw error;
  }
}

export async function listStudents(input: z.infer<typeof studentListSchema>) {
  const where: Prisma.UserWhereInput = { role: 'STUDENT', nim: { contains: input.search } };
  const [data, total] = await getPrisma().$transaction([
    getPrisma().user.findMany({
      where, select: accountSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (input.page - 1) * input.limit, take: input.limit,
    }),
    getPrisma().user.count({ where }),
  ]);
  return { data, meta: {
    page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit),
  } };
}
