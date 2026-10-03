import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { studentsRouter } from '../modules/students/students.routes.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/students', studentsRouter);

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server berjalan dengan baik.' });
});
