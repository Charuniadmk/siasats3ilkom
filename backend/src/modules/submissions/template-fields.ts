import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { HttpError } from '../../utils/http-error.js';

type FieldLine = { x: number; baseline: number; width: number };

export function fillField(
  page: PDFPage,
  font: PDFFont,
  value: string,
  label: string,
  lines: FieldLine[],
  size = 11,
  templateLabel = 'Proposal',
) {
  const text = value.replace(/\s+/gu, ' ').trim();
  const available = new Set(font.getCharacterSet());
  if (Array.from(text).some((character) => !available.has(character.codePointAt(0)!))) {
    throw new HttpError(
      400,
      `${label} mengandung karakter yang tidak didukung font template ${templateLabel}.`,
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
      `${label} terlalu panjang untuk area pada template ${templateLabel}. Ringkas isinya agar tata letak tetap sesuai dokumen asli.`,
    );
  return Math.max(1, rows);
}
