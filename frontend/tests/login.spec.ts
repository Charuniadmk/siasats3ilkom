import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  for (const [path, kind] of [['proposals', 'PROPOSAL'], ['qualifications', 'QUALIFICATION']]) await page.route('**/api/' + path + '/me', (route) => route.fulfill({ json: { success: true, data: { id: 'draft-' + path, kind, status: 'DRAFT', formData: {}, documents: [], student: { id: 'student-test', nim: '00123456', fullName: 'Mahasiswa Uji' } } } }));

  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 401, json: { success: false, message: 'Silakan masuk untuk melanjutkan.' },
  }));
});

test('Form mahasiswa memvalidasi input dan pergantian akun membersihkan password', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Masuk ke akun Anda' })).toBeVisible();
  await page.getByRole('button', { name: 'Masuk sebagai Mahasiswa' }).click();
  await expect(page.getByText('NIM wajib diisi.', { exact: true })).toBeVisible();
  await expect(page.getByText('Password wajib diisi.', { exact: true })).toBeVisible();
  await page.getByLabel('Nomor Induk Mahasiswa (NIM)').fill('00123456');
  await page.getByLabel('Password', { exact: true }).fill('password-uji');
  await page.getByRole('button', { name: 'Tampilkan password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('radio', { name: 'Admin', exact: true }).check();
  await expect(page.getByLabel('Username', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', { name: 'Masuk sebagai Admin' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Kegagalan login ditampilkan dan form bisa dicoba kembali', async ({ page }) => {
  await page.route('**/api/auth/login', (route) => route.fulfill({
    status: 401, json: { success: false, message: 'Username/NIM atau password tidak sesuai.' },
  }));
  await page.goto('/login');
  await page.getByLabel('Nomor Induk Mahasiswa (NIM)').fill('00123456');
  await page.getByLabel('Password', { exact: true }).fill('salah');
  await page.getByRole('button', { name: 'Masuk sebagai Mahasiswa' }).click();
  await expect(page.getByRole('alert')).toHaveText('Username/NIM atau password tidak sesuai.');
  await expect(page.getByRole('button', { name: 'Masuk sebagai Mahasiswa' })).toBeEnabled();
});

for (const role of ['ADMIN', 'STUDENT'] as const) {
  test(`Login ${role} mengirim identitas sesuai role dan dapat keluar`, async ({ page }) => {
    const identifier = role === 'ADMIN' ? 'admin.uji' : '00123456';
    const user = { id: 'test-user', role, username: role === 'ADMIN' ? identifier : null, nim: role === 'STUDENT' ? identifier : null };
    let active = false;
    await page.route('**/api/auth/me', (route) => route.fulfill(active
      ? { status: 200, json: { success: true, message: 'Sesi aktif.', data: user } }
      : { status: 401, json: { success: false, message: 'Silakan masuk untuk melanjutkan.' } }));
    await page.route('**/api/auth/login', async (route) => {
      expect(route.request().postDataJSON()).toEqual(role === 'ADMIN'
        ? { role, username: identifier, password: 'password-uji' }
        : { role, nim: identifier, password: 'password-uji' });
      active = true;
      await route.fulfill({ status: 200, json: { success: true, message: 'Berhasil masuk.', data: user } });
    });
    await page.route('**/api/auth/logout', async (route) => {
      active = false;
      await route.fulfill({ status: 200, json: { success: true, message: 'Berhasil keluar.' } });
    });
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    if (role === 'ADMIN') await page.getByRole('radio', { name: 'Admin', exact: true }).check();
    await page.getByLabel(role === 'ADMIN' ? 'Username' : 'Nomor Induk Mahasiswa (NIM)', { exact: true }).fill(identifier);
    await page.getByLabel('Password', { exact: true }).fill('password-uji');
    await page.getByRole('button', { name: role === 'ADMIN' ? 'Masuk sebagai Admin' : 'Masuk sebagai Mahasiswa' }).click();
    if (role === 'ADMIN') await expect(page.getByText('Anda berhasil masuk sebagai Admin.')).toBeVisible();
    else { await expect(page).toHaveURL(/\/dashboard$/); await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible(); }
    await page.reload();
    await expect(page.getByRole('button', { name: 'Keluar' })).toBeVisible();
    await page.getByRole('button', { name: 'Keluar' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Masuk ke akun Anda' })).toBeVisible();
  });
}
