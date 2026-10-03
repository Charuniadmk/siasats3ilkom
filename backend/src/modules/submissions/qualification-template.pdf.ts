import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import { HttpError } from '../../utils/http-error.js';
import { fillField } from './template-fields.js';
import type { AcademicForm } from './submissions.schema.js';

export const QUALIFICATION_SIGNATURE_ZONE = { x: 72.1, top: 507, width: 160, height: 42 } as const;
const assets = new URL('../../../assets/forms/', import.meta.url);

export async function generateQualificationTemplatePdf(
  form: AcademicForm,
  student: { fullName: string | null; nim: string | null },
  signature: Buffer,
) {
  const manifest = JSON.parse(
    await readFile(new URL('qualification-template.json', assets), 'utf8'),
  ) as { sourceFile: string; sourceSha256: string };
  const original = await readFile(new URL(manifest.sourceFile, assets));
  if (createHash('sha256').update(original).digest('hex') !== manifest.sourceSha256)
    throw new HttpError(
      503,
      'Dokumen acuan Kualifikasi telah berubah. Perbarui template PDF terlebih dahulu.',
    );
  let fontBytes: Buffer;
  try {
    fontBytes = await readFile(
      process.env.QUALIFICATION_CALIBRI_FONT_PATH ||
        process.env.PROPOSAL_CALIBRI_FONT_PATH ||
        join(process.env.WINDIR || 'C:\\Windows', 'Fonts', 'calibri.ttf'),
    );
  } catch {
    throw new HttpError(503, 'Font Calibri untuk template Kualifikasi belum tersedia di server.');
  }
  const pdf = await PDFDocument.load(await readFile(new URL('qualification-template.pdf', assets)));
  if (pdf.getPageCount() !== 1)
    throw new HttpError(503, 'Template Kualifikasi harus memiliki satu halaman.');
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  if (font.name !== 'Calibri')
    throw new HttpError(503, 'Font server tidak sesuai dengan Calibri pada template Kualifikasi.');
  const page = pdf.getPage(0);
  const [header] = await pdf.embedPdf(await readFile(new URL('qualification-header.pdf', assets)));
  page.drawPage(header!, { x: 135, y: page.getHeight() - 66 });
  const one = (value: string, label: string, x: number, baseline: number, width: number) =>
    fillField(page, font, value, label, [{ x, baseline, width }], 11, 'Kualifikasi');
  one(student.fullName || '', 'Nama mahasiswa', 190.5, 175.7007, 320);
  one(student.nim || '', 'NIM', 190.5, 220.7007, 320);
  one(form.phone, 'Nomor telepon', 190.5, 265.7007, 320);
  fillField(
    page,
    font,
    form.title,
    'Judul artikel',
    [
      { x: 195.5, baseline: 310.7007, width: 315 },
      { x: 190.5, baseline: 333.2008, width: 320 },
      { x: 190.5, baseline: 355.7008, width: 320 },
    ],
    11,
    'Kualifikasi',
  );
  one(form.promoter, 'Promotor', 195.5, 400.7008, 315);
  one(form.coPromoter1, 'Co-Promotor pertama', 195.5, 445.7008, 315);
  if (form.coPromoter2) one(form.coPromoter2, 'Co-Promotor kedua', 195.5, 459.2008, 315);
  const date = `${form.city}, ${new Date(form.formDate + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
  const centeredName = (
    name: string,
    label: string,
    center: number,
    baseline: number,
    width: number,
  ) => {
    const textWidth = font.widthOfTextAtSize(name, 11);
    one(name, label, center - textWidth / 2, baseline, width);
  };
  const studentCenter = QUALIFICATION_SIGNATURE_ZONE.x + QUALIFICATION_SIGNATURE_ZONE.width / 2;
  centeredName(date, 'Kota dan tanggal', studentCenter, 490.7008, 250);
  centeredName(student.fullName || '', 'Nama pada tanda tangan', studentCenter, 565.7008, 250);
  centeredName(form.promoter, 'Nama promotor pada persetujuan', 297.1, 648.2008, 180);
  centeredName(form.coPromoter1, 'Nama Co-Promotor pertama pada persetujuan', 143.1, 720.1008, 160);
  centeredName(
    form.coPromoter2 || '-',
    'Nama Co-Promotor kedua pada persetujuan',
    451.1,
    720.1008,
    160,
  );
  const image = await pdf.embedPng(signature);
  const zone = QUALIFICATION_SIGNATURE_ZONE;
  const scale = Math.min(zone.width / image.width, zone.height / image.height);
  page.drawImage(image, {
    x: zone.x + (zone.width - image.width * scale) / 2,
    y: page.getHeight() - zone.top - zone.height + (zone.height - image.height * scale) / 2,
    width: image.width * scale,
    height: image.height * scale,
  });
  pdf.setTitle('Form Pendaftaran Ujian Kualifikasi Disertasi');
  return Buffer.from(await pdf.save());
}
