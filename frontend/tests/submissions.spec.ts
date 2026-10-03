import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const form = {
  phone: '081234567890',
  title: 'Penelitian Sistem Akademik',
  promoter: 'Prof. Promotor',
  coPromoter1: 'Dr. Pembimbing',
  coPromoter2: '',
  program: 'Doktor Ilmu Komputer',
  city: 'Salatiga',
  formDate: '2026-10-04',
};
const student = {
  id: 'student-test',
  nim: '00123456',
  fullName: 'Mahasiswa Uji',
  gender: 'FEMALE',
  address: 'Jalan Pendidikan 10',
};
const pdf = readFileSync(resolve('tests/fixtures/sample.pdf'));
async function session(page: Page, role = 'STUDENT') {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: { ...student, role, username: role === 'ADMIN' ? 'Admin Uji' : null },
      },
    }),
  );
}
for (const kind of ['PROPOSAL', 'QUALIFICATION']) {
  const path = kind === 'PROPOSAL' ? 'proposals' : 'qualifications';
  const routePath = kind === 'PROPOSAL' ? '/proposal' : '/qualification';
  test(`${kind}: draft, PDF, unggahan, kunci pemeriksaan, penolakan dan kirim ulang`, async ({
    page,
  }, info) => {
    await session(page);
    let current = {
      id: 'submission-test',
      kind,
      status: 'DRAFT',
      student,
      formData: form,
      documents: [] as {
        id: string;
        type: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        updatedAt: string;
      }[],
      submittedAt: null as string | null,
      rejectionReason: null as string | null,
      maxDocumentSizeMb: 10,
    };
    await page.route('**/api/' + path + '/me**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/submit')) {
        expect(current.documents.length).toBe(kind === 'PROPOSAL' ? 6 : 4);
        current = {
          ...current,
          status: 'PENDING',
          submittedAt: '2026-10-04T10:00:00Z',
          rejectionReason: null,
        };
      } else if (url.pathname.endsWith('/generate'))
        current = {
          ...current,
          documents: [
            ...current.documents.filter((d) => !d.type.endsWith('_FORM')),
            {
              id: 'generated',
              type: kind === 'PROPOSAL' ? 'PROPOSAL_FORM' : 'QUALIFICATION_FORM',
              fileName: 'Formulir.pdf',
              mimeType: 'application/pdf',
              fileSize: pdf.length,
              updatedAt: '2026-10-04',
            },
          ],
        };
      else if (url.pathname.includes('/documents/')) {
        const type = url.pathname.split('/').pop()!;
        if (route.request().method() === 'GET') {
          await route.fulfill({ contentType: 'application/pdf', body: pdf });
          return;
        }
        current = {
          ...current,
          documents: [
            ...current.documents.filter((d) => d.type !== type),
            {
              id: type,
              type,
              fileName: type === 'SIGNATURE' ? 'signature.png' : 'Lampiran.pdf',
              mimeType: type === 'SIGNATURE' ? 'image/png' : 'application/pdf',
              fileSize: 100,
              updatedAt: '2026-10-04',
            },
          ],
        };
      } else if (route.request().method() === 'PATCH')
        current = {
          ...current,
          formData: route.request().postDataJSON(),
          documents: current.documents.filter((d) => !d.type.endsWith('_FORM')),
        };
      await route.fulfill({ json: { success: true, data: current } });
    });
    await page.goto(routePath);
    await expect(page.getByRole('button', { name: 'Kirim Pengajuan', exact: true })).toBeDisabled();
    await expect(page.getByLabel('NIM', { exact: true })).toHaveAttribute('readonly', '');
    const firstUpload =
      kind === 'PROPOSAL'
        ? 'Unggah Kuitansi Pembayaran'
        : 'Unggah Draft Artikel yang Dipublikasikan';
    await page
      .getByLabel(firstUpload, { exact: true })
      .setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('bad') });
    await expect(page.getByRole('alert')).toHaveText('Pilih dokumen PDF maksimal 10 MB.');
    await page
      .getByLabel('Tanda Tangan Mahasiswa (PNG transparan)', { exact: true })
      .setInputFiles({
        name: 'signature.png',
        mimeType: 'image/png',
        buffer: Buffer.from('png-fixture'),
      });
    await page.getByRole('button', { name: 'Buat PDF Formulir', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('PDF formulir berhasil dibuat.');
    for (const label of kind === 'PROPOSAL'
      ? ['Kuitansi Pembayaran', 'Draft Proposal', 'Transkrip Nilai']
      : ['Draft Artikel yang Dipublikasikan']) {
      await page
        .getByLabel('Unggah ' + label, { exact: true })
        .setInputFiles({ name: 'Lampiran.pdf', mimeType: 'application/pdf', buffer: pdf });
      await expect(page.getByRole('status')).toHaveText('Dokumen berhasil diunggah.');
    }
    const signedLabel =
      kind === 'PROPOSAL'
        ? 'Formulir Proposal Bertanda Tangan Persetujuan'
        : 'Form Kualifikasi Bertanda Tangan Persetujuan';
    await expect(page.getByRole('button', { name: 'Kirim Pengajuan', exact: true })).toBeDisabled();
    await expect(
      page.getByText('Dokumen yang belum lengkap: ' + signedLabel + '.', { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel('Unggah ' + signedLabel, { exact: true })
      .setInputFiles({ name: 'Persetujuan.pdf', mimeType: 'application/pdf', buffer: pdf });
    await expect(page.getByRole('status')).toHaveText('Dokumen berhasil diunggah.');
    await page.getByRole('button', { name: 'Pratinjau PDF', exact: true }).first().click();
    await expect(page.getByRole('dialog', { name: 'Pratinjau PDF' })).toBeVisible();
    await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
    const download = page.waitForEvent('download');
    await page.getByRole('dialog').getByRole('button', { name: 'Unduh PDF', exact: true }).click();
    expect((await download).suggestedFilename()).toBe('Formulir.pdf');
    await page.getByRole('button', { name: 'Tutup Pratinjau', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Kirim Pengajuan', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Kirim Pengajuan', exact: true }).click();
    await expect(page.getByText('Menunggu Pemeriksaan', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Nomor Telepon', { exact: true })).toBeDisabled();
    await expect(page.getByLabel(firstUpload, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Kirim Pengajuan', exact: true })).toHaveCount(0);
    current = { ...current, status: 'REJECTED', rejectionReason: 'Perbaiki judul penelitian.' };
    await page.reload();
    await expect(page.getByText('Perbaiki judul penelitian.', { exact: true })).toBeVisible();
    const title = page.getByLabel(kind === 'PROPOSAL' ? 'Judul Disertasi' : 'Judul Artikel', {
      exact: true,
    });
    await title.fill('Judul diperbaiki');
    await expect(
      page.getByRole('button', { name: 'Kirim Ulang Pengajuan', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Buat PDF Formulir', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('PDF formulir berhasil dibuat.');
    await expect(
      page.getByRole('button', { name: 'Kirim Ulang Pengajuan', exact: true }),
    ).toBeDisabled();
    await page
      .getByLabel('Unggah ' + signedLabel, { exact: true })
      .setInputFiles({ name: 'Persetujuan-ulang.pdf', mimeType: 'application/pdf', buffer: pdf });
    await expect(page.getByRole('status')).toHaveText('Dokumen berhasil diunggah.');
    await page.getByRole('button', { name: 'Kirim Ulang Pengajuan', exact: true }).click();
    await expect(page.getByText('Menunggu Pemeriksaan', { exact: true })).toBeVisible();
    current = { ...current, status: 'APPROVED' };
    await page.reload();
    await expect(page.getByText('Disetujui', { exact: true })).toBeVisible();
    await expect(title).toBeDisabled();
    await page.screenshot({ path: info.outputPath('pengajuan-' + path + '.png'), fullPage: true });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
  test(`${kind}: Admin mencari, membuka dokumen, menolak dengan alasan dan menyetujui`, async ({
    page,
  }) => {
    await session(page, 'ADMIN');
    const doc = {
      id: 'doc-test',
      type: kind === 'PROPOSAL' ? 'PROPOSAL_FORM' : 'QUALIFICATION_FORM',
      fileName: 'Formulir.pdf',
      mimeType: 'application/pdf',
      updatedAt: '2026-10-04',
      fileSize: pdf.length,
    };
    let status = 'PENDING';
    const root = '/admin/' + path;
    const submission = () => ({
      id: 'submission-test',
      kind,
      status,
      student,
      formData: form,
      documents: [
        doc,
        {
          ...doc,
          id: 'signed-test',
          type: kind === 'PROPOSAL' ? 'SIGNED_PROPOSAL_FORM' : 'SIGNED_QUALIFICATION_FORM',
          fileName: 'Persetujuan.pdf',
        },
        {
          ...doc,
          id: 'signature-test',
          type: 'SIGNATURE',
          fileName: 'signature.png',
          mimeType: 'image/png',
        },
      ],
      submittedAt: '2026-10-04T10:00:00Z',
      rejectionReason: status === 'REJECTED' ? 'Perbaiki lampiran.' : null,
    });
    await page.route('**/api/admin/' + path + '**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/review')) {
        const input = route.request().postDataJSON();
        expect(input.decision === 'APPROVED' || input.reason === 'Perbaiki lampiran.').toBe(true);
        status = input.decision;
      } else if (url.pathname.includes('/documents/')) {
        await route.fulfill({ contentType: 'application/pdf', body: pdf });
        return;
      } else if (!url.pathname.includes('/submission-test')) {
        await route.fulfill({
          json: {
            success: true,
            data: [submission()],
            meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        });
        return;
      }
      await route.fulfill({ json: { success: true, data: submission() } });
    });
    await page.goto(root);
    const request = page.waitForRequest(
      (r) =>
        r.url().includes('/api/admin/' + path + '?') &&
        new URL(r.url()).searchParams.get('search') === '00123456',
    );
    await page.getByLabel('Cari Mahasiswa', { exact: true }).fill('00123456');
    await request;
    await page.getByRole('combobox', { name: 'Filter Status', exact: true }).click();
    await page.getByRole('option', { name: 'Menunggu Pemeriksaan', exact: true }).click();
    await page.getByRole('link', { name: 'Lihat Detail', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Data Mahasiswa', exact: true })).toBeVisible();
    await expect(page.getByText('Persetujuan.pdf', { exact: true })).toBeVisible();
    for (const index of [0, 1]) {
      await page.getByRole('button', { name: 'Pratinjau PDF', exact: true }).nth(index).click();
      await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
      await page.getByRole('button', { name: 'Tutup Pratinjau', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Pratinjau Tanda Tangan', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Pratinjau Tanda Tangan' })).toBeVisible();
    await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
    await page.getByRole('button', { name: 'Tutup Pratinjau', exact: true }).click();
    await page.getByRole('button', { name: 'Tolak', exact: true }).click();
    await page.getByRole('button', { name: 'Tolak Pengajuan', exact: true }).click();
    await expect(page.getByText('Alasan penolakan wajib diisi.', { exact: true })).toBeVisible();
    await page.getByLabel('Alasan Penolakan *', { exact: true }).fill('Perbaiki lampiran.');
    await page.getByRole('button', { name: 'Tolak Pengajuan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Ditolak', { exact: true })).toBeVisible();
    status = 'PENDING';
    await page.reload();
    await page.getByRole('button', { name: 'Setujui', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Setujui Pengajuan', exact: true })
      .getByRole('button', { name: 'Setujui', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Disetujui', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Setujui', exact: true })).toHaveCount(0);
  });
}
