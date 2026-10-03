import { expect, test, type Page } from '@playwright/test';

const admin = { id: 'admin-test', role: 'ADMIN', username: 'admin', nim: null };

async function openMenu(page: Page) {
  const button = page.getByRole('button', { name: 'Buka menu', exact: true });
  if (await button.isVisible()) await button.click();
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200, json: { success: true, message: 'Sesi aktif.', data: admin },
  }));
  await page.route('**/api/students?**', (route) => route.fulfill({
    status: 200, json: { success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  }));
});

test('Sidebar menampilkan submenu bertingkat, route aktif, dan header', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('banner').getByRole('button', { name: 'Keluar' })).toBeVisible();
  await openMenu(page);
  const nav = page.getByRole('navigation', { name: 'Navigasi admin' });
  await nav.getByRole('button', { name: 'Proposal', exact: true }).click();
  await nav.getByRole('link', { name: 'LOA Conference', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'LOA Conference', exact: true })).toBeVisible();
  await openMenu(page);
  await nav.getByRole('link', { name: 'Kuitansi Pembayaran', exact: true }).click();
  await expect(page).toHaveURL(/\/proposal\/loa-conference\/payment-receipt$/);
  await page.reload();
  await openMenu(page);
  await expect(nav.getByRole('link', { name: 'Kuitansi Pembayaran', exact: true })).toHaveAttribute('aria-current', 'page');
  if (await page.getByRole('button', { name: 'Tutup menu', exact: true }).isVisible()) {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Menu admin' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Buka menu', exact: true })).toBeFocused();
  }
});

test('Admin membuat akun mahasiswa dengan NIM dan melihat hasilnya di daftar', async ({ page }) => {
  let created = false;
  await page.route('**/api/students?**', (route) => route.fulfill({
    status: 200, json: { success: true, data: created ? [{ id: 'student-test', nim: '00123456', createdAt: '2026-10-03T10:00:00Z' }] : [], meta: { page: 1, limit: 20, total: created ? 1 : 0, totalPages: created ? 1 : 0 } },
  }));
  await page.route('**/api/students', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ nim: '00123456', password: 'password-uji' });
    created = true;
    await route.fulfill({ status: 201, json: { success: true, message: 'Akun mahasiswa berhasil dibuat.', data: { id: 'student-test', nim: '00123456', createdAt: '2026-10-03T10:00:00Z' } } });
  });
  await page.goto('/students');
  await expect(page.getByText('Belum ada akun mahasiswa.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Tambah Akun Mahasiswa', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan Akun' }).click();
  await expect(page.getByText('NIM wajib diisi.', { exact: true })).toBeVisible();
  await expect(page.getByText('Password minimal 8 karakter.', { exact: true })).toBeVisible();
  await page.getByLabel('Nomor Induk Mahasiswa (NIM)', { exact: true }).fill('00123456');
  await page.getByLabel('Password', { exact: true }).fill('password-uji');
  await page.getByLabel('Konfirmasi Password', { exact: true }).fill('berbeda');
  await page.getByRole('button', { name: 'Simpan Akun' }).click();
  await expect(page.getByText('Konfirmasi password tidak sesuai.', { exact: true })).toBeVisible();
  await page.getByLabel('Konfirmasi Password', { exact: true }).fill('password-uji');
  await page.getByRole('button', { name: 'Simpan Akun' }).click();
  await expect(page).toHaveURL(/\/students$/);
  await expect(page.getByRole('status')).toHaveText('Akun mahasiswa dengan NIM 00123456 berhasil dibuat.');
  await expect(page.getByRole('cell', { name: '00123456', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('NIM duplikat ditampilkan pada form tanpa menghilangkan isian', async ({ page }) => {
  await page.route('**/api/students', (route) => route.fulfill({
    status: 409, json: { success: false, message: 'NIM sudah digunakan oleh akun mahasiswa lain.' },
  }));
  await page.goto('/students/new');
  await page.getByLabel('Nomor Induk Mahasiswa (NIM)', { exact: true }).fill('00123456');
  await page.getByLabel('Password', { exact: true }).fill('password-uji');
  await page.getByLabel('Konfirmasi Password', { exact: true }).fill('password-uji');
  await page.getByRole('button', { name: 'Simpan Akun' }).click();
  await expect(page.getByRole('alert')).toHaveText('NIM sudah digunakan oleh akun mahasiswa lain.');
  await expect(page.getByLabel('Nomor Induk Mahasiswa (NIM)', { exact: true })).toHaveValue('00123456');
  await expect(page.getByRole('button', { name: 'Simpan Akun' })).toBeEnabled();
});

test('Mahasiswa tidak dapat mengakses halaman pembuatan akun Admin', async ({ page }) => {
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200, json: { success: true, message: 'Sesi aktif.', data: { id: 'student-test', role: 'STUDENT', username: null, nim: '00123456' } },
  }));
  await page.goto('/students/new');
  await expect(page.getByText('Anda tidak memiliki izin untuk mengakses halaman ini.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan Akun' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Navigasi admin' })).toHaveCount(0);
});

test('Sesi yang kedaluwarsa saat memuat mahasiswa mengarahkan ke login', async ({ page }) => {
  await page.route('**/api/students?**', (route) => route.fulfill({
    status: 401, json: { success: false, message: 'Sesi Anda telah berakhir. Silakan masuk kembali.' },
  }));
  await page.goto('/students');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Masuk ke akun Anda' })).toBeVisible();
});
