import type { RequestHandler } from 'express';
import { getSessionUser, verifySession } from '../modules/auth/auth.service.js';
import type { Role } from '../modules/auth/auth.types.js';
import { HttpError } from '../utils/http-error.js';

export const authenticate: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.session;
  if (typeof token !== 'string' || !token) {
    throw new HttpError(401, 'Silakan masuk untuk melanjutkan.');
  }
  const claims = verifySession(token);
  res.locals.user = await getSessionUser(claims);
  next();
};

export function authorize(...roles: Role[]): RequestHandler {
  return (_req, res, next) => {
    if (!res.locals.user) throw new HttpError(401, 'Silakan masuk untuk melanjutkan.');
    if (!roles.includes(res.locals.user.role)) {
      throw new HttpError(403, 'Anda tidak memiliki izin untuk mengakses halaman ini.');
    }
    next();
  };
}
