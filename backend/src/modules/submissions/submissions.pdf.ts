import { PDFDocument, StandardFonts, rgb, type PDFPage } from 'pdf-lib';
import { generateProposalTemplatePdf } from './proposal-template.pdf.js';
import type { AcademicForm } from './submissions.schema.js';

export const SIGNATURE_ZONE = { x: 350, y: 120, width: 160, height: 70 } as const;
export async function generateFormPdf(
  kind: 'PROPOSAL' | 'QUALIFICATION',
  form: AcademicForm,
  student: {
    fullName: string | null;
    nim: string | null;
    gender: string | null;
    address: string | null;
  },
  signature: Buffer,
) {
  if (kind === 'PROPOSAL') return generateProposalTemplatePdf(form, student, signature);
  return generateQualificationPdf(form, student, signature);
}

async function generateQualificationPdf(
  form: AcademicForm,
  student: {
    fullName: string | null;
    nim: string | null;
    gender: string | null;
    address: string | null;
  },
  signature: Buffer,
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const image = await pdf.embedPng(signature);
  const clean = (text: string) =>
    Array.from(text.replace(/[\r\n\t]/g, ' '))
      .map((c) => {
        try {
          font.encodeText(c);
          return c;
        } catch {
          return '?';
        }
      })
      .join('');
  const line = (page: PDFPage, text: string, x: number, y: number, size = 11, strong = false) =>
    page.drawText(clean(text), { x, y, size, font: strong ? bold : font, color: rgb(0, 0, 0) });
  const wrap = (page: PDFPage, text: string, x: number, y: number, width: number, size = 11) => {
    let row = '';
    let current = y;
    for (const word of clean(text).split(/\s+/)) {
      for (const token of word.match(/.{1,50}/g) ?? ['']) {
        const next = row ? row + ' ' + token : token;
        if (font.widthOfTextAtSize(next, size) > width && row) {
          line(page, row, x, current, size);
          current -= 16;
          row = token;
        } else row = next;
      }
    }
    if (row) line(page, row, x, current, size);
    return current - 22;
  };
  const header = (page: PDFPage, title: string) => {
    line(page, 'PROGRAM DOKTOR ILMU KOMPUTER', 48, 785, 13, true);
    line(page, 'Universitas Kristen Satya Wacana', 48, 765, 11);
    page.drawLine({ start: { x: 48, y: 749 }, end: { x: 547, y: 749 }, thickness: 0.6 });
    line(page, title, 48, 724, 12, true);
  };
  const sign = (page: PDFPage) => {
    line(
      page,
      `${form.city}, ${new Date(form.formDate + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`,
      SIGNATURE_ZONE.x,
      220,
    );
    line(page, 'Mahasiswa,', SIGNATURE_ZONE.x, 202);
    const scale = Math.min(
      SIGNATURE_ZONE.width / image.width,
      SIGNATURE_ZONE.height / image.height,
    );
    page.drawImage(image, {
      x: SIGNATURE_ZONE.x + (SIGNATURE_ZONE.width - image.width * scale) / 2,
      y: SIGNATURE_ZONE.y + (SIGNATURE_ZONE.height - image.height * scale) / 2,
      width: image.width * scale,
      height: image.height * scale,
    });
    wrap(page, student.fullName ?? '', SIGNATURE_ZONE.x, 102, 190);
  };
  let page = pdf.addPage([595.28, 841.89]);
  header(page, 'FORM PENDAFTARAN UJIAN KUALIFIKASI DISERTASI');
  let y = 688;
  for (const [label, value] of [
    ['Nama', student.fullName],
    ['NIM', student.nim],
    ['Nomor Telepon', form.phone],
    ['Program Studi', form.program],
    ['Judul Artikel', form.title],
    ['Promotor', form.promoter],
    ['Co-Promotor 1', form.coPromoter1],
    ['Co-Promotor 2', form.coPromoter2 || '-'],
  ]) {
    const valueText = ': ' + (value ?? '');
    const estimatedHeight =
      (Math.ceil(font.widthOfTextAtSize(clean(valueText), 11) / 350) + 2) * 16;
    if (y - estimatedHeight < 380) {
      page = pdf.addPage([595.28, 841.89]);
      header(page, 'FORMULIR PENDAFTARAN (LANJUTAN)');
      y = 688;
    }
    line(page, String(label), 48, y, 11, true);
    y = wrap(page, valueText, 168, y, 370);
  }
  if (y < 420) {
    page = pdf.addPage([595.28, 841.89]);
    header(page, 'FORMULIR PENDAFTARAN (LANJUTAN)');
    y = 688;
  }
  sign(page);
  line(page, 'Menyetujui,', 48, 335, 11, true);
  for (const [i, label] of ['Promotor', 'Co-Promotor 1', 'Co-Promotor 2'].entries()) {
    const x = 48 + i * 174;
    line(page, label, x, 310);
    page.drawLine({ start: { x, y: 260 }, end: { x: x + 145, y: 260 }, thickness: 0.4 });
    wrap(page, [form.promoter, form.coPromoter1, form.coPromoter2 || '-'][i]!, x, 243, 150, 10);
  }
  pdf.setTitle('Form Pendaftaran Ujian Kualifikasi Disertasi');
  return Buffer.from(await pdf.save());
}
