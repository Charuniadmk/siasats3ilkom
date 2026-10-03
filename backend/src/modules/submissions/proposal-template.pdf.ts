import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { HttpError } from '../../utils/http-error.js';
import type { AcademicForm } from './submissions.schema.js';

type StudentIdentity = {
  fullName: string | null;
  nim: string | null;
  gender: string | null;
  address: string | null;
};
type FieldLine = { x: number; baseline: number; width: number };

// Coordinates use the top left origin measured in the original two-page document.
export const PROPOSAL_SIGNATURE_ZONES = [
  { page: 0, x: 324.1, top: 642, width: 160, height: 24 },
  { page: 1, x: 72.1, top: 427, width: 160, height: 24 },
] as const;
const assets = new URL('../../../assets/forms/', import.meta.url);

async function readTemplate() {
  const manifest = JSON.parse(
    await readFile(new URL('proposal-template.json', assets), 'utf8'),
  ) as {
    sourceFile: string;
    sourceSha256: string;
  };
  const source = await readFile(new URL(manifest.sourceFile, assets));
  if (createHash('sha256').update(source).digest('hex') !== manifest.sourceSha256) {
    throw new HttpError(
      503,
      'Dokumen acuan Proposal telah berubah. Perbarui template PDF terlebih dahulu.',
    );
  }
  return readFile(new URL('proposal-template.pdf', assets));
}

async function readFonts() {
  const directory = join(process.env.WINDIR || 'C:\\Windows', 'Fonts');
  try {
    return await Promise.all([
      readFile(process.env.PROPOSAL_TIMES_FONT_PATH || join(directory, 'times.ttf')),
      readFile(process.env.PROPOSAL_CALIBRI_FONT_PATH || join(directory, 'calibri.ttf')),
    ]);
  } catch {
    throw new HttpError(
      503,
      'Font Times New Roman dan Calibri untuk template Proposal belum tersedia di server.',
    );
  }
}

function fillField(
  page: PDFPage,
  font: PDFFont,
  value: string,
  label: string,
  lines: FieldLine[],
  size = 11,
) {
  const text = value.replace(/\s+/gu, ' ').trim();
  const available = new Set(font.getCharacterSet());
  if (Array.from(text).some((character) => !available.has(character.codePointAt(0)!))) {
    throw new HttpError(
      400,
      `${label} mengandung karakter yang tidak didukung font template Proposal.`,
    );
  }
  let remaining = text;
  let rows = 0;
  for (const line of lines) {
    if (!remaining) break;
    let count = 0;
    const characters = Array.from(remaining);
    while (
      count < characters.length &&
      font.widthOfTextAtSize(characters.slice(0, count + 1).join(''), size) <= line.width
    )
      count++;
    if (!count) break;
    let row = characters.slice(0, count).join('');
    if (count < characters.length) {
      const wordEnd = row.lastIndexOf(' ');
      if (wordEnd > 0) row = row.slice(0, wordEnd);
    }
    page.drawText(row, {
      x: line.x,
      y: page.getHeight() - line.baseline,
      font,
      size,
      color: rgb(0, 0, 0),
    });
    remaining = remaining.slice(row.length).trimStart();
    rows++;
  }
  if (remaining)
    throw new HttpError(
      400,
      `${label} terlalu panjang untuk area pada template Proposal. Ringkas isinya agar tata letak tetap sesuai dokumen asli.`,
    );
  return Math.max(1, rows);
}

export async function generateProposalTemplatePdf(
  form: AcademicForm,
  student: StudentIdentity,
  signature: Buffer,
) {
  const [template, fonts, sections] = await Promise.all([
    readTemplate(),
    readFonts(),
    readFile(new URL('proposal-sections.pdf', assets)),
  ]);
  const pdf = await PDFDocument.load(template);
  if (pdf.getPageCount() !== 2)
    throw new HttpError(503, 'Template Proposal harus memiliki dua halaman.');
  pdf.registerFontkit(fontkit);
  const times = await pdf.embedFont(fonts[0]!, { subset: true });
  const calibri = await pdf.embedFont(fonts[1]!, { subset: true });
  if (times.name !== 'TimesNewRomanPSMT' || calibri.name !== 'Calibri') {
    throw new HttpError(
      503,
      'Font server tidak sesuai dengan Times New Roman dan Calibri pada template Proposal.',
    );
  }
  const [first, second] = pdf.getPages() as [PDFPage, PDFPage];
  const parts = await pdf.embedPdf(sections, [0, 1, 2, 3, 4, 5]);
  const drawSection = (page: PDFPage, index: number, x: number, top: number) => {
    const part = parts[index]!;
    page.drawPage(part, { x, y: page.getHeight() - top - part.height });
  };
  for (const page of [first, second]) drawSection(page, 4, 347.1, 49);
  const one = (
    page: PDFPage,
    value: string,
    label: string,
    x: number,
    baseline: number,
    width: number,
    size = 11,
    font = times,
  ) => fillField(page, font, value, label, [{ x, baseline, width }], size);
  one(first, student.fullName || '', 'Nama mahasiswa', 294, 161.1008, 217);
  one(first, student.nim || '', 'NIM', 294, 173.7508, 217);
  if (student.gender !== 'MALE' && student.gender !== 'FEMALE')
    throw new HttpError(400, 'Lengkapi jenis kelamin pada profil mahasiswa.');
  const excluded = student.gender === 'MALE' ? [342.7, 392.15] : [293.9, 334.16];
  first.drawLine({
    start: { x: excluded[0]!, y: first.getHeight() - 182.9 },
    end: { x: excluded[1]!, y: first.getHeight() - 182.9 },
    thickness: 0.5,
  });
  const addressRows = fillField(first, times, student.address || '', 'Alamat', [
    { x: 294, baseline: 199.0508, width: 217 },
    ...[218.0008, 236.9507, 255.9008].map((baseline) => ({ x: 288.1, baseline, width: 220 })),
  ]);
  const phoneBaseline = 199.0508 + addressRows * 18.95;
  drawSection(first, 0, 72.1, phoneBaseline - 274.8508 + 262);
  one(first, form.phone, 'Nomor telepon', 151.63, phoneBaseline, 173.25);
  const titleBaseline = phoneBaseline + 25.3;
  drawSection(first, 1, 72.1, titleBaseline - 300.1508 + 287);
  const titleRows = fillField(first, times, form.title, 'Judul disertasi', [
    { x: 294, baseline: titleBaseline, width: 206 },
    ...[1, 2, 3, 4, 5].map((index) => ({
      x: 81.1,
      baseline: titleBaseline + index * 18.95,
      width: 429,
    })),
  ]);
  const promoterBaseline = titleBaseline + (titleRows - 1) * 18.95 + 37.9;
  drawSection(first, 2, 72.1, promoterBaseline - 432.8008 + 420);
  one(first, form.promoter, 'Promotor', 194.4, promoterBaseline, 207);
  one(first, form.coPromoter1, 'Co-Promotor pertama', 194.4, promoterBaseline + 18.95, 207);
  one(first, form.coPromoter2 || '-', 'Co-Promotor kedua', 196.85, promoterBaseline + 37.9, 206);
  const requirementsBaseline = promoterBaseline + 88.45;
  drawSection(first, 3, 72.1, requirementsBaseline - 521.2508 + 510);
  const dateBaseline = 635.1008;
  const date = `${form.city}, ${new Date(form.formDate + 'T00:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
  one(first, date, 'Kota dan tanggal', 324.1, dateBaseline, 200);
  one(first, student.fullName || '', 'Nama pada tanda tangan', 324.1, dateBaseline + 37.95, 200);
  one(second, student.fullName || '', 'Nama mahasiswa', 224.5, 221.2007, 302, 12);
  one(second, student.nim || '', 'NIM', 224.5, 248.8008, 302, 12);
  one(second, form.program, 'Program studi', 224.5, 276.4008, 302, 12);
  const approvalTitleRows = fillField(
    second,
    times,
    `“${form.title}”`,
    'Judul pada lembar persetujuan',
    [
      { x: 72.1, baseline: 324.7007, width: 449.316 },
      { x: 72.1, baseline: 345.4008, width: 444 },
      { x: 72.1, baseline: 366.1008, width: 389.316 },
    ],
    12,
  );
  const closingBaseline = 324.7007 + approvalTitleRows * 20.7;
  drawSection(second, 5, 72.1, closingBaseline - 386.8008 + 373);
  one(second, date, 'Kota dan tanggal', 72.1, 421.3008, 300, 12);
  one(second, student.fullName || '', 'Nama pada tanda tangan', 72.1, 482.7, 300, 12);
  for (const [index, name] of [
    form.promoter,
    form.coPromoter1,
    form.coPromoter2 || '-',
  ].entries()) {
    const baseline = [547.0508, 587.9008, 628.7507][index]!;
    const wrapped = calibri.widthOfTextAtSize(name, 11) > 160;
    fillField(
      second,
      calibri,
      name,
      ['Promotor', 'Co-Promotor pertama', 'Co-Promotor kedua'][index]!,
      [
        { x: 204.55, baseline: baseline - (wrapped ? 6 : 0), width: 160 },
        { x: 204.55, baseline: baseline + 7, width: 160 },
      ],
    );
  }
  const image = await pdf.embedPng(signature);
  for (const zone of PROPOSAL_SIGNATURE_ZONES) {
    const page = pdf.getPage(zone.page);
    const top = zone.top;
    const scale = Math.min(zone.width / image.width, zone.height / image.height);
    page.drawImage(image, {
      x: zone.x + (zone.width - image.width * scale) / 2,
      y: page.getHeight() - top - zone.height + (zone.height - image.height * scale) / 2,
      width: image.width * scale,
      height: image.height * scale,
    });
  }
  pdf.setTitle('Formulir Pendaftaran Ujian Proposal Disertasi');
  return Buffer.from(await pdf.save());
}
