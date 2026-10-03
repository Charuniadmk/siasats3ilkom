import { compare, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { getPrisma } from '../../config/prisma.js';
import { HttpError } from '../../utils/http-error.js';
import type { LoginInput } from './auth.schema.js';
import type { AuthClaims, SessionUser } from './auth.types.js';

const issuer = 'doctor-student-management';
const audience = 'doctor-student-management-web';
const dummyPasswordHash = hash('invalid-account-timing-check', 12);
const claimsSchema = z.object({
  userId: z.uuid(),
  role: z.enum(['ADMIN', 'STUDENT']),
  sessionVersion: z.number().int().nonnegative(),
});

export function sessionDurationSeconds() {
  const unit = env.JWT_EXPIRES_IN.slice(-1);
  const multiplier = unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return Number(env.JWT_EXPIRES_IN.slice(0, -1)) * multiplier;
}

function getSecret() {
  if (!env.JWT_SECRET) {
    throw new HttpError(503, 'Layanan masuk belum tersedia. Silakan coba kembali.');
  }
  return env.JWT_SECRET;
}

export function signSession(claims: AuthClaims) {
  return jwt.sign(claims, getSecret(), {
    algorithm: 'HS256', issuer, audience, expiresIn: sessionDurationSeconds(),
  });
}

export function verifySession(token: string): AuthClaims {
  const secret = getSecret();
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'], issuer, audience });
    return claimsSchema.parse(decoded);
  } catch {
    throw new HttpError(401, 'Sesi Anda telah berakhir. Silakan masuk kembali.');
  }
}

function publicUser(user: SessionUser): SessionUser {
  return { id: user.id, role: user.role, username: user.username, nim: user.nim, fullName: user.fullName };
}

export async function login(input: LoginInput) {
  getSecret();
  const user = await getPrisma().user.findFirst({
    where: input.role === 'ADMIN'
      ? { role: 'ADMIN', username: input.username }
      : { role: 'STUDENT', nim: input.nim },
  });
  const matches = await compare(input.password, user?.passwordHash ?? await dummyPasswordHash);
  if (!user || !matches) {
    throw new HttpError(401, 'Username/NIM atau password tidak sesuai.');
  }
  const token = signSession({ userId: user.id, role: user.role, sessionVersion: user.sessionVersion });
  return { token, user: publicUser(user) };
}

export async function getSessionUser(claims: AuthClaims) {
  const user = await getPrisma().user.findUnique({ where: { id: claims.userId } });
  if (!user || user.role !== claims.role || user.sessionVersion !== claims.sessionVersion) {
    throw new HttpError(401, 'Sesi Anda telah berakhir. Silakan masuk kembali.');
  }
  return publicUser(user);
}

export async function revokeSessions(userId: string) {
  await getPrisma().user.update({
    where: { id: userId }, data: { sessionVersion: { increment: 1 } },
  });
}
