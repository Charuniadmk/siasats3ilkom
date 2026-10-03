import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

export const trustedOrigin: RequestHandler = (req, _res, next) => {
  if (req.get('origin') !== new URL(env.FRONTEND_URL).origin) {
    throw new HttpError(403, 'Permintaan tidak diizinkan.');
  }
  next();
};
