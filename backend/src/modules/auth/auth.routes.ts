import { Router, type CookieOptions } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { authenticate } from '../../middleware/authenticate.js';
import { trustedOrigin } from '../../middleware/trusted-origin.js';
import { HttpError } from '../../utils/http-error.js';
import { loginSchema } from './auth.schema.js';
import { login, revokeSessions, sessionDurationSeconds } from './auth.service.js';

export const authRouter = Router();

const cookieOptions: CookieOptions = {
  httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'lax', path: '/api',
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.' },
});

authRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

authRouter.post('/login', trustedOrigin, loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message = !issue?.path.length ? 'Periksa kembali data yang Anda masukkan.'
      : issue.path[0] === 'role'
      ? 'Pilih jenis akun yang valid.'
      : issue.message;
    throw new HttpError(400, message);
  }
  const result = await login(parsed.data);
  res.cookie('session', result.token, { ...cookieOptions, maxAge: sessionDurationSeconds() * 1000 });
  res.json({ success: true, message: 'Berhasil masuk.', data: result.user });
});

authRouter.get('/me', authenticate, (_req, res) => {
  res.json({ success: true, message: 'Sesi aktif.', data: res.locals.user });
});

authRouter.post('/logout', trustedOrigin, authenticate, async (_req, res) => {
  await revokeSessions(res.locals.user!.id);
  res.clearCookie('session', cookieOptions);
  res.json({ success: true, message: 'Berhasil keluar.' });
});
