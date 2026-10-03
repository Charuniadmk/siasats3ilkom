import { expect, test, type Page } from '@playwright/test';

const profile = { id: 'student-test', nim: '00123456', fullName: 'Mahasiswa Uji', gender: 'FEMALE', address: 'Jalan Pendidikan 10', birthDate: '1995-02-28T00:00:00.000Z', createdAt: '2026-10-03T10:00:00.000Z' };

async function openMenu(page: Page) {
  await expect(page.getByRole('banner')).toBeVisible();
  const button = page.getByRole('button', { name: 'Buka menu', exact: true });
  if (await button.isVisible()) await button.click();
}

test.beforeEach(async ({ page }) => {
  for (const [path, kind] of [['proposals', 'PROPOSAL'], ['qualifications', 'QUALIFICATION']]) await page.route('**/api/' + path + '/me', (route) => route.fulfill({ json: { success: true, data: { id: 'draft-' + path, kind, status: 'DRAFT', formData: {}, documents: [], student: { id: 'student-test', nim: '00123456', fullName: 'Mahasiswa Uji' } } } }));

  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { success: true, data: { id: profile.id, role: 'STUDENT', username: null, nim: profile.nim, fullName: profile.fullName } } }));
  await page.route('**/api/profile', (route) => route.fulfill({ json: { success: true, data: profile } }));
});

test('Menu mahasiswa memiliki Proposal dan Kualifikasi tanpa submenu, serta drawer mobile', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  await openMenu(page);
  const nav = page.getByRole('navigation', { name: 'Navigasi mahasiswa' });
  for (const label of ['Dashboard', 'Proposal', 'Kualifikasi', 'Dosen', 'Ruangan', 'Profil']) await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  await expect(nav.getByRole('button', { name: 'Proposal', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'LOA Conference', exact: true })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Proposal', exact: true }).click();
  await expect(page).toHaveURL(/\/proposal$/);
  await openMenu(page);
  await nav.getByRole('link', { name: 'Kualifikasi', exact: true }).click();
  await expect(page).toHaveURL(/\/qualification$/);
  await openMenu(page);
  if (await page.getByRole('dialog', { name: 'Menu mahasiswa', exact: true }).isVisible()) {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Buka menu', exact: true })).toBeFocused();
  }
});

test('Mahasiswa memperbarui profil sendiri tanpa mengganti NIM dan melihat hasil tersimpan', async ({ page }, testInfo) => {
  let current = { ...profile };
  await page.route('**/api/auth/me', (route) => route.fulfill({ json: { success: true, data: { id: current.id, role: 'STUDENT', username: null, nim: current.nim, fullName: current.fullName } } }));
  await page.route('**/api/profile', async (route) => {
    if (route.request().method() === 'PATCH') {
      const input = route.request().postDataJSON();
      expect(input).toEqual({ fullName: 'Nama Mahasiswa Baru', gender: 'MALE', address: 'Jalan Kampus 20', birthDate: '1995-02-28' });
      current = { ...current, ...input, birthDate: input.birthDate + 'T00:00:00.000Z' };
    }
    await route.fulfill({ json: { success: true, message: 'Profil berhasil diperbarui.', data: current } });
  });
  await page.goto('/profile');
  await expect(page.getByLabel('Nomor Induk Mahasiswa (NIM)', { exact: true })).toHaveValue(profile.nim);
  await expect(page.getByLabel('Nomor Induk Mahasiswa (NIM)', { exact: true })).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Tanggal Lahir', { exact: true })).toHaveValue('28 Februari 1995');
  await page.getByLabel('Nama Lengkap', { exact: true }).fill('Nama Mahasiswa Baru');
  await page.getByRole('combobox', { name: 'Jenis Kelamin', exact: true }).click();
  await page.getByRole('option', { name: 'Laki-laki', exact: true }).click();
  await page.getByLabel('Alamat', { exact: true }).fill('Jalan Kampus 20');
  await page.getByRole('button', { name: 'Simpan Profil', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Profil berhasil diperbarui.');
  await page.reload();
  await expect(page.getByLabel('Nama Lengkap', { exact: true })).toHaveValue('Nama Mahasiswa Baru');
  await page.screenshot({ path: testInfo.outputPath('profil-mahasiswa.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Profil gagal disimpan mempertahankan isian, dan sesi berakhir mengarah ke login', async ({ page }) => {
  await page.route('**/api/profile', (route) => route.fulfill(route.request().method() === 'PATCH'
    ? { status: 500, json: { success: false, message: 'Gagal menyimpan profil. Silakan coba kembali.' } }
    : { json: { success: true, data: profile } }));
  await page.goto('/profile');
  await page.getByLabel('Nama Lengkap', { exact: true }).fill('Nama yang belum tersimpan');
  await page.getByRole('button', { name: 'Simpan Profil', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Gagal menyimpan profil. Silakan coba kembali.');
  await expect(page.getByLabel('Nama Lengkap', { exact: true })).toHaveValue('Nama yang belum tersimpan');
  await page.route('**/api/profile', (route) => route.fulfill({ status: 401, json: { success: false, message: 'Sesi Anda telah berakhir. Silakan masuk kembali.' } }));
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
});

test('Mahasiswa ditolak saat membuka halaman khusus Admin', async ({ page }) => {
  for (const path of ['/students', '/students/new', '/admin/proposals', '/admin/qualifications']) {
    await page.goto(path);
    await expect(page.getByText('Anda tidak memiliki izin untuk mengakses halaman ini.', { exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigasi admin' })).toHaveCount(0);
  }
});

test('Password divalidasi dan password saat ini yang salah tidak mengakhiri sesi', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/profile/password', (route) => {
    requests++;
    return route.fulfill({ status: 400, json: { success: false, message: 'Password saat ini tidak sesuai.' } });
  });
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Ubah Password', exact: true }).click();
  await expect(page.getByText('Password saat ini wajib diisi.', { exact: true })).toBeVisible();
  await page.getByLabel('Password Saat Ini', { exact: true }).fill('password-lama');
  await page.getByLabel('Password Baru', { exact: true }).fill('password-baru');
  await page.getByLabel('Konfirmasi Password Baru', { exact: true }).fill('tidak-sama');
  await page.getByRole('button', { name: 'Ubah Password', exact: true }).click();
  await expect(page.getByText('Konfirmasi password tidak sesuai.', { exact: true })).toBeVisible();
  expect(requests).toBe(0);
  await page.getByLabel('Konfirmasi Password Baru', { exact: true }).fill('password-baru');
  await page.getByRole('button', { name: 'Ubah Password', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Password saat ini tidak sesuai.');
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel('Password Baru', { exact: true })).toHaveValue('password-baru');
  await page.locator('section').filter({ has: page.getByRole('heading', { name: 'Ubah Password', exact: true }) }).getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(page.getByLabel('Password Saat Ini', { exact: true })).toHaveValue('');
});

test('Password berhasil diubah mengarahkan mahasiswa ke login dengan pemberitahuan', async ({ page }) => {
  let active = true;
  await page.route('**/api/auth/me', (route) => route.fulfill(active
    ? { json: { success: true, data: { id: profile.id, role: 'STUDENT', nim: profile.nim } } }
    : { status: 401, json: { success: false, message: 'Silakan masuk kembali.' } }));
  await page.route('**/api/profile/password', (route) => {
    expect(route.request().method()).toBe('PATCH');
    expect(route.request().postDataJSON()).toEqual({ currentPassword: 'password-lama', newPassword: 'password-baru', confirmPassword: 'password-baru' });
    active = false;
    return route.fulfill({ json: { success: true, message: 'Password berhasil diubah. Silakan masuk kembali dengan password baru.' } });
  });
  await page.goto('/profile');
  await page.getByLabel('Password Saat Ini', { exact: true }).fill('password-lama');
  await page.getByLabel('Password Baru', { exact: true }).fill('password-baru');
  await page.getByLabel('Konfirmasi Password Baru', { exact: true }).fill('password-baru');
  await page.getByRole('button', { name: 'Ubah Password', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('status')).toHaveText('Password berhasil diubah. Silakan masuk kembali dengan password baru.');
});
