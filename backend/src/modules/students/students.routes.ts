import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { trustedOrigin } from '../../middleware/trusted-origin.js';
import { HttpError } from '../../utils/http-error.js';
import { createStudentSchema, studentListSchema } from './students.schema.js';
import { createStudent, listStudents } from './students.service.js';

export const studentsRouter = Router();
studentsRouter.use(authenticate, authorize('ADMIN'));
studentsRouter.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

studentsRouter.get('/', async (req, res) => {
  const input = studentListSchema.safeParse(req.query);
  if (!input.success) throw new HttpError(400, 'Parameter pencarian mahasiswa tidak valid.');
  const result = await listStudents(input.data);
  res.json({ success: true, ...result });
});

studentsRouter.post('/', trustedOrigin, async (req, res) => {
  const input = createStudentSchema.safeParse(req.body);
  if (!input.success) {
    const issue = input.error.issues[0];
    throw new HttpError(400, issue?.path.length ? issue.message : 'Periksa kembali data akun mahasiswa.');
  }
  const user = await createStudent(input.data);
  res.status(201).json({ success: true, message: 'Akun mahasiswa berhasil dibuat.', data: user });
});
