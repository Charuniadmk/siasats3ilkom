import { expect, test, type Page, type Locator } from '@playwright/test';

async function selectOption(scope: Page | Locator, label: string, option: string) {
  await scope.getByRole('combobox', { name: label, exact: true }).click();
  await scope.getByRole('option', { name: option, exact: true }).click();
}

async function pickDate(page: Page, trigger: string, year: string, month: string, date: string) {
  await page.getByRole('button', { name: trigger, exact: true }).click();
  const calendar = page.getByRole('dialog', { name: trigger, exact: true });
  await selectOption(calendar, 'Pilih tahun', year);
  await selectOption(calendar, 'Pilih bulan', month);
  await calendar.getByRole('button', { name: date, exact: true }).click();
}

const profile = { fullName: 'Mahasiswa Uji', gender: 'FEMALE', address: 'Jalan Pendidikan 10', birthDate: '1995-02-28' };

async function fillProfile(page: Page) {
  await page.getByLabel('Nama Lengkap', { exact: true }).fill(profile.fullName);
  await selectOption(page, 'Jenis Kelamin', 'Perempuan');
  await page.getByLabel('Alamat', { exact: true }).fill(profile.address);
  await page.getByRole('button', { name: 'Pilih tanggal lahir', exact: true }).click();
  const calendar = page.getByRole('dialog', { name: 'Pilih tanggal lahir', exact: true });
  await selectOption(calendar, 'Pilih tahun', '1995');
  await selectOption(calendar, 'Pilih bulan', 'Februari');
  await calendar.getByRole('button', { name: '28 Februari 1995', exact: true }).click();
  await expect(page.getByLabel('Tanggal Lahir', { exact: true })).toHaveValue('28 Februari 1995');
}

const admin = { id: 'admin-test', role: 'ADMIN', username: 'admin', nim: null };

async function openMenu(page: Page) {
  const button = page.getByRole('button', { name: 'Buka menu', exact: true });
  if (await button.isVisible()) await button.click();
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/admin/proposals?**', (route) => route.fulfill({ json: { success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } } }));
  await page.route('**/api/auth/me', (route) => route.fulfill({
    status: 200, json: { success: true, message: 'Sesi aktif.', data: admin },
  }));
  await page.route('**/api/students?**', (route) => route.fulfill({
    status: 200, json: { success: true, data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
  }));
});

test('Sidebar menampilkan menu akademik tanpa submenu, route aktif, dan header', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('banner').getByRole('button', { name: 'Keluar' })).toBeVisible();
  await openMenu(page);
  const nav = page.getByRole('navigation', { name: 'Navigasi admin' });
  await nav.getByRole('link', { name: 'Proposal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pengajuan Proposal', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/proposals$/);
  await page.reload();
  await openMenu(page);
  await expect(nav.getByRole('link', { name: 'Proposal', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'LOA Conference', exact: true })).toHaveCount(0);
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
    expect(route.request().postDataJSON()).toEqual({ ...profile, nim: '00123456', password: 'password-uji' });
    created = true;
    await route.fulfill({ status: 201, json: { success: true, message: 'Akun mahasiswa berhasil dibuat.', data: { id: 'student-test', nim: '00123456', createdAt: '2026-10-03T10:00:00Z' } } });
  });
  await page.goto('/students');
  await expect(page.getByText('Belum ada akun mahasiswa.', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Tambah Akun Mahasiswa', exact: true }).click();
  await page.getByRole('button', { name: 'Simpan Akun' }).click();
  await expect(page.getByText('NIM wajib diisi.', { exact: true })).toBeVisible();
  await expect(page.getByText('Nama lengkap wajib diisi.', { exact: true })).toBeVisible();
  await expect(page.getByText('Silakan pilih jenis kelamin.', { exact: true })).toBeVisible();
  await expect(page.getByText('Alamat wajib diisi.', { exact: true })).toBeVisible();
  await expect(page.getByText('Tanggal lahir wajib diisi.', { exact: true })).toBeVisible();
  await expect(page.getByText('Password minimal 8 karakter.', { exact: true })).toBeVisible();
  await page.getByLabel('Nomor Induk Mahasiswa (NIM)', { exact: true }).fill('00123456');
  await fillProfile(page);
  await page.getByLabel('Password', { exact: true }).fill('password-uji');
  await page.getByLabel('Konfirmasi Password', { exact: true }).fill('berbeda');
  await page.getByRole('button', { name: 'Simpan Akun' }).click();
  await expect(page.getByText('Konfirmasi password tidak sesuai.', { exact: true })).toBeVisible();
  await page.getByLabel('Konfirmasi Password', { exact: true }).fill('password-uji');
  await page.getByRole('button', { name: 'Simpan Akun' }).click();
  await expect(page).toHaveURL(/\/students$/);
  await expect(page.getByRole('status').filter({ hasText: 'Akun mahasiswa dengan NIM' })).toHaveText('Akun mahasiswa dengan NIM 00123456 berhasil dibuat.');
  await expect(page.getByRole('cell', { name: '00123456', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('NIM duplikat ditampilkan pada form tanpa menghilangkan isian', async ({ page }) => {
  await page.route('**/api/students', (route) => route.fulfill({
    status: 409, json: { success: false, message: 'NIM sudah digunakan oleh akun mahasiswa lain.' },
  }));
  await page.goto('/students/new');
  await page.getByLabel('Nomor Induk Mahasiswa (NIM)', { exact: true }).fill('00123456');
  await fillProfile(page);
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

test('Tabel mahasiswa memilih baris, mengirim sorting dan filter ke API, serta mengubah dan menghapus akun', async ({ page }) => {
  let nim = '00123456';
  let deleted = false;
  const student = () => ({ ...profile, birthDate: profile.birthDate + 'T00:00:00.000Z', id: 'student-test', nim, createdAt: '2026-10-03T10:00:00Z' });
  const requests: URL[] = [];
  await page.route('**/api/students?**', async (route) => {
    const url = new URL(route.request().url());
    requests.push(url);
    const limit = Number(url.searchParams.get('limit'));
    await route.fulfill({ json: { success: true, data: deleted ? [] : [student()], meta: { page: 1, limit, total: deleted ? 0 : 1, totalPages: deleted ? 0 : 1 } } });
  });
  await page.route('**/api/students/student-test', async (route) => {
    if (route.request().method() === 'PATCH') {
      expect(route.request().postDataJSON()).toEqual({ ...profile, nim: '00987654' });
      nim = '00987654';
      await route.fulfill({ json: { success: true, message: 'Akun mahasiswa berhasil diperbarui.', data: student() } });
    } else {
      expect(route.request().method()).toBe('DELETE');
      deleted = true;
      await route.fulfill({ json: { success: true, message: 'Akun mahasiswa berhasil dihapus.' } });
    }
  });
  await page.goto('/students');
  await page.getByRole('checkbox', { name: 'Pilih mahasiswa 00123456', exact: true }).check();
  await expect(page.getByRole('checkbox', { name: 'Pilih semua data pada halaman ini' })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Pilih semua data pada halaman ini' }).uncheck();
  await expect(page.getByRole('checkbox', { name: 'Pilih mahasiswa 00123456', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Urutkan NIM', exact: true }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get('sortBy')).toBe('nim');
  await expect.poll(() => requests.at(-1)?.searchParams.get('sortOrder')).toBe('asc');
  await page.getByRole('button', { name: 'Urutkan NIM', exact: true }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get('sortOrder')).toBe('desc');
  await page.getByLabel('Cari berdasarkan NIM atau nama', { exact: true }).fill('001');
  await pickDate(page, 'Pilih tanggal mulai', '2026', 'Oktober', '1 Oktober 2026');
  await pickDate(page, 'Pilih tanggal sampai', '2026', 'Oktober', '4 Oktober 2026');
  await page.getByRole('button', { name: 'Cari', exact: true }).click();
  await expect.poll(() => requests.at(-1)?.searchParams.get('search')).toBe('001');
  expect(requests.at(-1)?.searchParams.get('dateFrom')).toBe('2026-10-01');
  expect(requests.at(-1)?.searchParams.get('dateTo')).toBe('2026-10-04');
  await page.getByRole('button', { name: 'Atur ulang filter' }).click();
  await selectOption(page, 'Data per halaman', '10');
  await expect.poll(() => requests.at(-1)?.searchParams.get('limit')).toBe('10');
  await page.getByRole('button', { name: 'Ubah mahasiswa 00123456', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Ubah Akun Mahasiswa' });
  await edit.getByLabel('Nomor Induk Mahasiswa (NIM)', { exact: true }).fill('00987654');
  await edit.getByRole('button', { name: 'Simpan', exact: true }).click();
  await expect(page.getByRole('cell', { name: '00987654', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hapus mahasiswa 00987654', exact: true }).click();
  await page.getByRole('dialog', { name: 'Hapus Akun Mahasiswa' }).getByRole('button', { name: 'Batal', exact: true }).click();
  expect(deleted).toBe(false);
  await page.getByRole('button', { name: 'Hapus mahasiswa 00987654', exact: true }).click();
  await page.getByRole('dialog', { name: 'Hapus Akun Mahasiswa' }).getByRole('button', { name: 'Hapus', exact: true }).click();
  await expect(page.getByText('Belum ada akun mahasiswa.', { exact: true })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Akun mahasiswa berhasil dihapus.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Kalender tanggal lahir mendukung tahun kabisat, batas tanggal, dan pembatalan', async ({ page }, testInfo) => {
  await page.goto('/students/new');
  await page.getByRole('button', { name: 'Pilih tanggal lahir', exact: true }).click();
  const calendar = page.getByRole('dialog', { name: 'Pilih tanggal lahir', exact: true });
  await expect(calendar.getByRole('button', { name: 'Bulan selanjutnya', exact: true })).toBeDisabled();
  await selectOption(calendar, 'Pilih tahun', '2000');
  await selectOption(calendar, 'Pilih bulan', 'Februari');
  await calendar.getByRole('button', { name: '29 Februari 2000', exact: true }).click();
  await expect(page.getByLabel('Tanggal Lahir', { exact: true })).toHaveValue('29 Februari 2000');
  await page.getByRole('button', { name: 'Pilih tanggal lahir', exact: true }).click();
  await selectOption(calendar, 'Pilih tahun', '2001');
  await expect(calendar.getByRole('button', { name: '29 Februari 2001', exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('kalender.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(calendar).not.toBeVisible();
  await expect(page.getByLabel('Tanggal Lahir', { exact: true })).toHaveValue('29 Februari 2000');
  await expect(page.getByRole('button', { name: 'Pilih tanggal lahir', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Menu select mendukung keyboard, pembatalan, dan validasi form', async ({ page }, testInfo) => {
  await page.goto('/students/new');
  const gender = page.getByRole('combobox', { name: 'Jenis Kelamin', exact: true });
  await gender.focus();
  await gender.press('ArrowDown');
  await expect(page.getByRole('listbox', { name: 'Pilihan', exact: true })).toBeVisible();
  await gender.press('ArrowDown');
  await gender.press('Enter');
  await expect(gender).toHaveText('Perempuan');
  await gender.press('ArrowDown');
  await gender.press('Home');
  await gender.press('Escape');
  await expect(gender).toHaveText('Perempuan');
  await expect(gender).toBeFocused();
  await gender.click();
  await expect(page.getByRole('listbox', { name: 'Pilihan', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('select-menu.png') });
  await page.getByRole('heading', { name: 'Tambah Akun Mahasiswa', exact: true }).click();
  await expect(gender).toHaveAttribute('aria-expanded', 'false');
  await page.getByLabel('Password', { exact: true }).fill('password-uji');
  await page.getByLabel('Konfirmasi Password', { exact: true }).fill('password-uji');
  await page.getByRole('button', { name: 'Simpan Akun', exact: true }).click();
  await expect(page.getByLabel('Nomor Induk Mahasiswa (NIM)', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
