import { createSubmissionRouter } from '../modules/submissions/submissions.routes.js';
import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { profileRouter } from '../modules/profile/profile.routes.js';
import { studentsRouter } from '../modules/students/students.routes.js';

export const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/students', studentsRouter);
apiRouter.use('/profile', profileRouter);
apiRouter.use('/proposals', createSubmissionRouter('PROPOSAL'));
apiRouter.use('/qualifications', createSubmissionRouter('QUALIFICATION'));
apiRouter.use('/admin/proposals', createSubmissionRouter('PROPOSAL', true));
apiRouter.use('/admin/qualifications', createSubmissionRouter('QUALIFICATION', true));

apiRouter.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Server berjalan dengan baik.' });
});
