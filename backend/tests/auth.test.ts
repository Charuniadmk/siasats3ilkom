import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { compare, hash } from 'bcrypt';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.NODE_ENV = 'test';

const { loginSchema, accountPasswordSchema } = await import('../src/modules/auth/auth.schema.js');
const { signSession, verifySession } = await import('../src/modules/auth/auth.service.js');
const { createStudentSchema } = await import('../src/modules/students/students.schema.js');
const profile = { fullName: 'Mahasiswa Uji', gender: 'FEMALE', address: 'Jalan Pendidikan 10', birthDate: '1995-02-28' };

const { HttpError } = await import('../src/utils/http-error.js');

test('Validasi membedakan username admin dan NIM mahasiswa, serta mempertahankan nol awal', () => {
  const admin = loginSchema.parse({ role: 'ADMIN', username: ' Admin.Test ', password: 'password' });
  assert.equal(admin.role === 'ADMIN' && admin.username, 'admin.test');
  const student = loginSchema.parse({ role: 'STUDENT', nim: '0012345', password: 'password' });
  assert.equal(student.role === 'STUDENT' && student.nim, '0012345');
  assert.equal(loginSchema.safeParse({ role: 'ADMIN', nim: '0012345', password: 'password' }).success, false);
  assert.equal(loginSchema.safeParse({ role: 'STUDENT', nim: 'abc', password: 'password' }).success, false);
  assert.equal(loginSchema.safeParse({ role: 'SUPERADMIN', username: 'admin', password: 'password' }).success, false);
  assert.equal(accountPasswordSchema.safeParse('a'.repeat(73)).success, false);
  assert.equal(accountPasswordSchema.safeParse('🙂'.repeat(19)).success, false);
  assert.equal(accountPasswordSchema.safeParse('pendek').success, false);
});

test('JWT menolak token palsu, kedaluwarsa, dan algoritma yang berbeda', () => {
  const claims = { userId: randomUUID(), role: 'ADMIN' as const, sessionVersion: 0 };
  assert.deepEqual(verifySession(signSession(claims)), claims);
  const invalidTokens = [
    'token-palsu',
    jwt.sign(claims, randomBytes(48).toString('hex'), { expiresIn: '1d' }),
    jwt.sign(claims, process.env.JWT_SECRET!, { issuer: 'doctor-student-management', audience: 'doctor-student-management-web', expiresIn: -1 }),
    jwt.sign(claims, process.env.JWT_SECRET!, { algorithm: 'HS384', issuer: 'doctor-student-management', audience: 'doctor-student-management-web' }),
  ];
  for (const token of invalidTokens) {
    assert.throws(() => verifySession(token), (error: unknown) => error instanceof HttpError && error.status === 401);
  }
});

test('Login MySQL, akses akun mahasiswa khusus Admin, sesi, origin, dan pembatasan login', {
  skip: process.env.AUTH_DATABASE_TESTS !== '1',
}, async (t) => {
  const { app } = await import('../src/app.js');
  const { env } = await import('../src/config/env.js');
  const { getPrisma, disconnectPrisma } = await import('../src/config/prisma.js');
  const prisma = getPrisma();
  const server = app.listen(0, '127.0.0.1');
  const createdIds: string[] = [];
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    try { await prisma.user.deleteMany({ where: { id: { in: createdIds } } }); }
    finally { await disconnectPrisma(); }
  });
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api/auth`;
  const identifier = `00${Date.now()}`;
  const adminPassword = randomBytes(24).toString('hex');
  const studentPassword = randomBytes(24).toString('hex');
  for (const role of ['ADMIN', 'STUDENT'] as const) {
    const user = await prisma.user.create({ data: {
      role,
      username: role === 'ADMIN' ? identifier : null,
      nim: role === 'STUDENT' ? identifier : null,
      passwordHash: await hash(role === 'ADMIN' ? adminPassword : studentPassword, 12),
    } });
    createdIds.push(user.id);
  }
  const postLogin = (body: object, origin = new URL(env.FRONTEND_URL).origin) => fetch(`${base}/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
  });
  assert.equal((await fetch(`${base}/me`)).status, 401);
  const wrongPassword = await postLogin({ role: 'ADMIN', username: identifier, password: studentPassword });
  assert.equal(wrongPassword.status, 401);
  const missingAccount = await postLogin({ role: 'ADMIN', username: `absent_${randomUUID()}`, password: studentPassword });
  assert.deepEqual(await wrongPassword.json(), await missingAccount.json());
  assert.equal((await postLogin({ role: 'STUDENT', nim: identifier, password: adminPassword })).status, 401);
  assert.equal((await postLogin({ role: 'ADMIN', username: identifier, password: adminPassword }, 'https://untrusted.example')).status, 403);
  assert.equal((await postLogin({ role: 'STUDENT', nim: 'not-a-number', password: studentPassword })).status, 400);

  for (const role of ['ADMIN', 'STUDENT'] as const) {
    const response = await postLogin(role === 'ADMIN'
      ? { role, username: identifier, password: adminPassword }
      : { role, nim: identifier, password: studentPassword });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.role, role);
    assert.equal('passwordHash' in body.data, false);
    assert.equal('token' in body, false);
    const setCookie = response.headers.get('set-cookie');
    assert.ok(setCookie?.includes('HttpOnly'));
    assert.ok(setCookie.includes('SameSite=Lax'));
    assert.ok(setCookie.includes('Path=/api'));
    const cookie = setCookie.split(';')[0];
    const session = await fetch(`${base}/me`, { headers: { Cookie: cookie } });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).data.role, role);
    const studentsUrl = base.replace('/auth', '/students');
    const newNim = `${identifier}77`;
    const postStudent = (body: object, origin = new URL(env.FRONTEND_URL).origin) => fetch(studentsUrl, {
      method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, ...body }),
    });
    if (role === 'ADMIN') {
      assert.equal((await fetch(studentsUrl)).status, 401);
      assert.equal((await fetch(base.replace('/auth', '/profile'))).status, 401);
      assert.equal((await fetch(base.replace('/auth', '/profile'), { headers: { Cookie: cookie } })).status, 403);
      assert.equal((await postStudent({ nim: newNim, password: studentPassword }, 'https://untrusted.example')).status, 403);
      assert.equal((await postStudent({ nim: newNim, password: 'pendek' })).status, 400);
      assert.equal((await postStudent({ nim: newNim, password: studentPassword, fullName: '' })).status, 400);
      assert.equal((await postStudent({ nim: newNim, password: studentPassword, birthDate: '2100-01-01' })).status, 400);
      assert.equal((await postStudent({ nim: newNim, password: studentPassword, role: 'ADMIN' })).status, 400);
      const created = await postStudent({ nim: newNim, password: studentPassword });
      assert.equal(created.status, 201);
      const createdBody = await created.json();
      createdIds.push(createdBody.data.id);
      assert.equal(createdBody.data.nim, newNim);
      assert.equal(createdBody.data.fullName, profile.fullName);
      assert.equal(createdBody.data.gender, profile.gender);
      assert.equal(createdBody.data.address, profile.address);
      assert.equal(createdBody.data.birthDate.slice(0, 10), profile.birthDate);
      assert.equal('passwordHash' in createdBody.data, false);
      assert.equal((await postStudent({ nim: newNim, password: studentPassword })).status, 409);
      const list = await fetch(`${studentsUrl}?search=${newNim}&limit=1&page=1`, { headers: { Cookie: cookie } });
      assert.equal(list.status, 200);
      const listBody = await list.json();
      assert.equal(listBody.meta.total, 1);
      assert.equal(listBody.data[0].nim, newNim);
      assert.equal('passwordHash' in listBody.data[0], false);
      const newLogin = await postLogin({ role: 'STUDENT', nim: newNim, password: studentPassword });
      assert.equal(newLogin.status, 200);
      assert.equal((await newLogin.json()).data.role, 'STUDENT');
      const studentCookie = newLogin.headers.get('set-cookie')!.split(';')[0];
      const accountUrl = `${studentsUrl}/${createdBody.data.id}`;
      const modify = (method: string, data?: object, session = cookie, origin = new URL(env.FRONTEND_URL).origin) => fetch(accountUrl, {
        method, headers: { Cookie: session, Origin: origin, 'Content-Type': 'application/json' },
        ...(data && { body: JSON.stringify(data) }),
      });
      assert.equal((await modify('PATCH', { nim: newNim }, studentCookie)).status, 403);
      assert.equal((await modify('DELETE', undefined, studentCookie)).status, 403);
      assert.equal((await modify('PATCH', { nim: newNim }, cookie, 'https://untrusted.example')).status, 403);
      assert.equal((await modify('DELETE', undefined, cookie, 'https://untrusted.example')).status, 403);
      assert.equal((await modify('PATCH', { nim: identifier })).status, 409);
      assert.equal((await modify('PATCH', { nim: newNim, role: 'ADMIN' })).status, 400);
      assert.equal((await modify('PATCH', { nim: newNim, birthDate: '1995-02-30' })).status, 400);
      const renamedNim = `${newNim}1`;
      const updated = await modify('PATCH', { nim: renamedNim, fullName: 'Nama Mahasiswa Baru', gender: 'MALE', address: 'Alamat baru', birthDate: '1990-01-01' });
      assert.equal(updated.status, 200);
      assert.equal('passwordHash' in (await updated.json()).data, false);
      assert.equal((await fetch(`${base}/me`, { headers: { Cookie: studentCookie } })).status, 401);
      assert.equal((await postLogin({ role: 'STUDENT', nim: renamedNim, password: studentPassword })).status, 200);
      const profileSearch = await fetch(`${studentsUrl}?search=Nama%20Mahasiswa%20Baru&sortBy=fullName`, { headers: { Cookie: cookie } });
      const profileSearchBody = await profileSearch.json();
      assert.ok(profileSearchBody.data.some((row: { id: string; birthDate: string }) => row.id === createdBody.data.id && row.birthDate.slice(0, 10) === '1990-01-01'));
      const changedPassword = randomBytes(24).toString('hex');
      assert.equal((await modify('PATCH', { nim: renamedNim, password: changedPassword })).status, 200);
      assert.equal((await postLogin({ role: 'STUDENT', nim: renamedNim, password: changedPassword })).status, 200);
      assert.equal((await fetch(`${studentsUrl}/${createdIds[0]}`, { method: 'DELETE', headers: { Cookie: cookie, Origin: new URL(env.FRONTEND_URL).origin } })).status, 404);
      for (const sortOrder of ['asc', 'desc']) {
        const sorted = await fetch(`${studentsUrl}?search=${identifier}&sortBy=nim&sortOrder=${sortOrder}&limit=100&dateFrom=2000-01-01&dateTo=2099-12-31`, { headers: { Cookie: cookie } });
        assert.equal(sorted.status, 200);
        const rows = (await sorted.json()).data as { nim: string }[];
        const nims = rows.map((row) => row.nim);
        const expected = [...nims].sort();
        assert.deepEqual(nims, sortOrder === 'asc' ? expected : expected.reverse());
      }
      const excluded = await fetch(`${studentsUrl}?search=${renamedNim}&dateTo=2000-01-01`, { headers: { Cookie: cookie } });
      assert.equal((await excluded.json()).meta.total, 0);
      for (const query of ['sortBy=passwordHash', 'sortOrder=invalid', 'dateFrom=2026-10-05&dateTo=2026-10-01']) {
        assert.equal((await fetch(`${studentsUrl}?${query}`, { headers: { Cookie: cookie } })).status, 400);
      }
      assert.equal((await modify('DELETE')).status, 200);
      assert.equal((await modify('DELETE')).status, 404);
    } else {
      const profileUrl = base.replace('/auth', '/profile');
      const personal = await fetch(profileUrl, { headers: { Cookie: cookie } });
      assert.equal(personal.status, 200);
      const personalBody = await personal.json();
      assert.equal(personalBody.data.id, body.data.id);
      assert.equal('passwordHash' in personalBody.data, false);
      const otherStudent = await prisma.user.create({ data: { role: 'STUDENT', nim: identifier + '999', fullName: 'Profil mahasiswa lain', passwordHash: await hash(studentPassword, 12) } });
      createdIds.push(otherStudent.id);
      const patchProfile = (data: object, origin = new URL(env.FRONTEND_URL).origin) => fetch(profileUrl, {
        method: 'PATCH', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      });
      for (const protectedField of [{ id: otherStudent.id }, { userId: otherStudent.id }, { role: 'ADMIN' }, { nim: otherStudent.nim }, { password: studentPassword }]) {
        assert.equal((await patchProfile({ ...profile, ...protectedField })).status, 400);
      }
      assert.equal((await patchProfile(profile, 'https://untrusted.example')).status, 403);
      assert.equal((await patchProfile({ ...profile, birthDate: '2100-01-01' })).status, 400);
      const savedProfile = await patchProfile(profile);
      assert.equal(savedProfile.status, 200);
      const savedBody = await savedProfile.json();
      assert.equal(savedBody.data.id, body.data.id);
      assert.equal(savedBody.data.nim, identifier);
      assert.equal(savedBody.data.fullName, profile.fullName);
      assert.equal('passwordHash' in savedBody.data, false);
      assert.equal((await prisma.user.findUnique({ where: { id: otherStudent.id } }))?.fullName, 'Profil mahasiswa lain');
      assert.equal((await fetch(profileUrl + '/' + otherStudent.id, { headers: { Cookie: cookie } })).status, 404);
      assert.equal((await fetch(base + '/me', { headers: { Cookie: cookie } })).status, 200);

      assert.equal((await fetch(studentsUrl, { headers: { Cookie: cookie } })).status, 403);
      assert.equal((await postStudent({ nim: `${newNim}2`, password: studentPassword })).status, 403);
    }
    const forged = signSession({ userId: body.data.id, role: role === 'ADMIN' ? 'STUDENT' : 'ADMIN', sessionVersion: 0 });
    assert.equal((await fetch(`${base}/me`, { headers: { Cookie: `session=${forged}` } })).status, 401);
    const logout = await fetch(`${base}/logout`, {
      method: 'POST', headers: { Origin: new URL(env.FRONTEND_URL).origin, Cookie: cookie },
    });
    assert.equal(logout.status, 200);
    assert.ok(logout.headers.get('set-cookie')?.includes('Expires=Thu, 01 Jan 1970'));
    assert.equal((await fetch(`${base}/me`, { headers: { Cookie: cookie } })).status, 401);
  }


  const studentAccount = await prisma.user.findFirstOrThrow({ where: { nim: identifier, role: 'STUDENT' } });
  const passwordCookie = 'session=' + signSession({ userId: studentAccount.id, role: 'STUDENT', sessionVersion: studentAccount.sessionVersion });
  const passwordUrl = base.replace('/auth', '/profile/password');
  const newPassword = randomBytes(24).toString('hex');
  const passwordInput = { currentPassword: studentPassword, newPassword, confirmPassword: newPassword };
  const changePassword = (data: object, cookie = passwordCookie, origin = new URL(env.FRONTEND_URL).origin) => fetch(passwordUrl, {
    method: 'PATCH', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  assert.equal((await changePassword(passwordInput, '')).status, 401);
  const adminAccount = await prisma.user.findFirstOrThrow({ where: { username: identifier, role: 'ADMIN' } });
  const adminCookie = 'session=' + signSession({ userId: adminAccount.id, role: 'ADMIN', sessionVersion: adminAccount.sessionVersion });
  assert.equal((await changePassword(passwordInput, adminCookie)).status, 403);
  assert.equal((await changePassword(passwordInput, passwordCookie, 'https://untrusted.example')).status, 403);
  for (const invalid of [
    { ...passwordInput, currentPassword: 'password-salah' },
    { ...passwordInput, confirmPassword: 'tidak-sama' },
    { ...passwordInput, newPassword: 'pendek', confirmPassword: 'pendek' },
    { ...passwordInput, id: adminAccount.id },
    { ...passwordInput, newPassword: studentPassword, confirmPassword: studentPassword },
  ]) assert.equal((await changePassword(invalid)).status, 400);
  assert.equal((await fetch(base + '/me', { headers: { Cookie: passwordCookie } })).status, 200);
  const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: studentAccount.id } });
  assert.equal(unchanged.passwordHash, studentAccount.passwordHash);
  assert.equal(unchanged.sessionVersion, studentAccount.sessionVersion);
  const changed = await changePassword(passwordInput);
  assert.equal(changed.status, 200);
  assert.ok(changed.headers.get('set-cookie')?.includes('Expires=Thu, 01 Jan 1970'));
  assert.deepEqual(await changed.json(), { success: true, message: 'Password berhasil diubah. Silakan masuk kembali dengan password baru.' });
  const savedPassword = await prisma.user.findUniqueOrThrow({ where: { id: studentAccount.id } });
  assert.equal(await compare(newPassword, savedPassword.passwordHash), true);
  assert.equal(await compare(studentPassword, savedPassword.passwordHash), false);
  assert.equal(savedPassword.sessionVersion, studentAccount.sessionVersion + 1);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: adminAccount.id } })).passwordHash, adminAccount.passwordHash);
  assert.equal((await fetch(base + '/me', { headers: { Cookie: passwordCookie } })).status, 401);
  assert.equal((await changePassword(passwordInput)).status, 401);
  assert.equal((await postLogin({ role: 'STUDENT', nim: identifier, password: studentPassword })).status, 401);
  assert.equal((await postLogin({ role: 'STUDENT', nim: identifier, password: newPassword })).status, 200);

  let limited: Response | undefined;
  for (let attempt = 0; attempt < 21; attempt++) {
    const response = await postLogin({ role: 'ADMIN' });
    if (response.status === 429) { limited = response; break; }
    assert.equal(response.status, 400);
  }
  assert.ok(limited, 'Percobaan login harus dibatasi.');
  assert.equal((await limited.json()).message, 'Terlalu banyak percobaan masuk. Silakan coba lagi dalam 15 menit.');
  assert.ok(limited.headers.get('retry-after'));
});

test('Profil registrasi wajib lengkap dan tanggal lahir harus valid', () => {
  const valid = { ...profile, nim: '001122', password: 'password-uji' };
  assert.equal(createStudentSchema.safeParse(valid).success, true);
  for (const field of ['fullName', 'gender', 'address', 'birthDate']) {
    assert.equal(createStudentSchema.safeParse({ ...valid, [field]: undefined }).success, false);
  }
  for (const birthDate of ['1995-02-30', '2100-01-01', '1899-12-31', '']) {
    assert.equal(createStudentSchema.safeParse({ ...valid, birthDate }).success, false);
  }
  assert.equal(createStudentSchema.safeParse({ ...valid, fullName: '   ' }).success, false);
  assert.equal(createStudentSchema.safeParse({ ...valid, address: '   ' }).success, false);
  assert.equal(createStudentSchema.safeParse({ ...valid, gender: 'INVALID' }).success, false);
});
