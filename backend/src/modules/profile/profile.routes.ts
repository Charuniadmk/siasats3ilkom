import { rateLimit } from 'express-rate-limit';
import { changePasswordSchema } from './profile.schema.js';
import { changeStudentPassword } from './profile.service.js';
import { sessionCookieOptions } from '../auth/session-cookie.js';
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { trustedOrigin } from '../../middleware/trusted-origin.js';
import { HttpError } from '../../utils/http-error.js';
import { studentProfileUpdateSchema } from '../students/students.schema.js';
import { getStudentProfile, updateStudentProfile } from '../students/students.service.js';

export const profileRouter = Router();
profileRouter.use(authenticate, authorize('STUDENT'));
profileRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

profileRouter.get('/', async (_req, res) => {
  const data = await getStudentProfile(res.locals.user!.id);
  res.json({ success: true, data });
});

profileRouter.patch('/', trustedOrigin, async (req, res) => {
  const input = studentProfileUpdateSchema.safeParse(req.body);
  if (!input.success) {
    const issue = input.error.issues[0];
    throw new HttpError(400, issue?.path.length ? issue.message : 'Periksa kembali data profil mahasiswa.');
  }
  const data = await updateStudentProfile(res.locals.user!.id, input.data);
  res.json({ success: true, message: 'Profil berhasil diperbarui.', data });
});

const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10,
  keyGenerator: (_req, res) => res.locals.user!.id,
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan mengubah password. Silakan coba lagi dalam 15 menit.' },
});

profileRouter.patch('/password', trustedOrigin, passwordLimiter, async (req, res) => {
  const input = changePasswordSchema.safeParse(req.body);
  if (!input.success) {
    const issue = input.error.issues[0];
    throw new HttpError(400, issue?.path.length ? issue.message : 'Periksa kembali data password.');
  }
  await changeStudentPassword(res.locals.user!.id, input.data);
  res.clearCookie('session', sessionCookieOptions);
  res.json({ success: true, message: 'Password berhasil diubah. Silakan masuk kembali dengan password baru.' });
});
