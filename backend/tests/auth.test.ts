import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { hash } from 'bcrypt';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.NODE_ENV = 'test';

const { loginSchema, accountPasswordSchema } = await import('../src/modules/auth/auth.schema.js');
const { signSession, verifySession } = await import('../src/modules/auth/auth.service.js');
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
      method: 'POST', headers: { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (role === 'ADMIN') {
      assert.equal((await fetch(studentsUrl)).status, 401);
      assert.equal((await postStudent({ nim: newNim, password: studentPassword }, 'https://untrusted.example')).status, 403);
      assert.equal((await postStudent({ nim: newNim, password: 'pendek' })).status, 400);
      assert.equal((await postStudent({ nim: newNim, password: studentPassword, role: 'ADMIN' })).status, 400);
      const created = await postStudent({ nim: newNim, password: studentPassword });
      assert.equal(created.status, 201);
      const createdBody = await created.json();
      createdIds.push(createdBody.data.id);
      assert.equal(createdBody.data.nim, newNim);
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
    } else {
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
