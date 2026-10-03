import { hash } from 'bcrypt';
import type { z } from 'zod';
import { getPrisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { HttpError } from '../../utils/http-error.js';
import type { createStudentSchema, studentListSchema, updateStudentSchema } from './students.schema.js';

const accountSelect = { id: true, nim: true, fullName: true, gender: true, address: true, birthDate: true, createdAt: true } as const;

export async function createStudent(input: z.infer<typeof createStudentSchema>) {
  try {
    return await getPrisma().user.create({
      data: { role: 'STUDENT', nim: input.nim, fullName: input.fullName, gender: input.gender, address: input.address, birthDate: new Date(input.birthDate + 'T00:00:00Z'), passwordHash: await hash(input.password, 12) },
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
  const where: Prisma.UserWhereInput = { role: 'STUDENT', OR: [{ nim: { contains: input.search } }, { fullName: { contains: input.search } }] };
  if (input.dateFrom || input.dateTo) {
    where.createdAt = {
      ...(input.dateFrom && { gte: new Date(`${input.dateFrom}T00:00:00+07:00`) }),
      ...(input.dateTo && { lt: new Date(new Date(`${input.dateTo}T00:00:00+07:00`).getTime() + 86400000) }),
    };
  }
  const [data, total] = await getPrisma().$transaction([
    getPrisma().user.findMany({
      where, select: accountSelect,
      orderBy: [{ [input.sortBy]: input.sortOrder }, { id: 'asc' }],
      skip: (input.page - 1) * input.limit, take: input.limit,
    }),
    getPrisma().user.count({ where }),
  ]);
  return { data, meta: {
    page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit),
  } };
}

export async function updateStudent(id: string, input: z.infer<typeof updateStudentSchema>) {
  try {
    return await getPrisma().user.update({
      where: { id, role: 'STUDENT' },
      data: {
        nim: input.nim,
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.gender !== undefined && { gender: input.gender }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.birthDate !== undefined && { birthDate: new Date(input.birthDate + 'T00:00:00Z') }),
        sessionVersion: { increment: 1 },
        ...(input.password && { passwordHash: await hash(input.password, 12) }),
      },
      select: accountSelect,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new HttpError(409, 'NIM sudah digunakan oleh akun mahasiswa lain.');
      if (error.code === 'P2025') throw new HttpError(404, 'Mahasiswa tidak ditemukan.');
    }
    throw error;
  }
}

export async function deleteStudent(id: string) {
  try {
    await getPrisma().user.delete({ where: { id, role: 'STUDENT' } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new HttpError(404, 'Mahasiswa tidak ditemukan.');
    }
    throw error;
  }
}
