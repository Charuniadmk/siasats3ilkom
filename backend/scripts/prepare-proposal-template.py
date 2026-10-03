"""Prepare the Proposal PDF assets from the original document's PDF export.
Usage: python backend/scripts/prepare-proposal-template.py path/to/export.pdf
Requires PyMuPDF. Never modifies the original Word document.
"""
import hashlib
import json
import sys
from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
pdf = fitz.open(source)
if len(pdf) != 2:
    raise ValueError('Dokumen Proposal harus memiliki dua halaman.')
removed = []
for index, page in enumerate(pdf):
    for block in page.get_text('rawdict')['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                chars = span['chars']
                text = ''.join(c['c'] for c in chars)
                positions = []
                if '\u2026' in text:
                    positions = [i for i, c in enumerate(chars) if c['c'] == '\u2026' or (c['c'] == '.' and i > 0 and chars[i-1]['c'] in ['\u2026', '.'])]
                    if index == 1 and 300 < span['bbox'][1] < 370:
                        positions += [i for i, c in enumerate(chars) if c['c'] in ['\u201c', '\u201d']]
                if text.startswith('Salatiga,'):
                    positions = list(range(len(chars)))
                for n in positions:
                    rect = fitz.Rect(chars[n]['bbox'])
                    page.add_redact_annot(rect, fill=False, cross_out=False)
                    removed.append({'page': index, 'rect': list(rect)})
    page.apply_redactions(images=0, graphics=0)

# Keep native text/font streams in reusable sections, without the letterhead image.
text_only = fitz.open(stream=pdf.tobytes(), filetype='pdf')
for page in text_only:
    for image in page.get_images():
        page.delete_image(image[0])
sections = [
    ('phone', (72.1, 262, 530, 282)),
    ('title', (72.1, 287, 530, 305)),
    ('promoters', (72.1, 420, 530, 475)),
    ('requirements', (72.1, 510, 550, 612)),
    ('contacts', (136.7, 49, 337, 95)),
    ('approval_closing', (72.1, 373, 530, 391)),
]
parts = fitz.open()
for _, coords in sections:
    rect = fitz.Rect(coords)
    page = parts.new_page(width=rect.width, height=rect.height)
    page.show_pdf_page(page.rect, text_only, 1 if _ == 'approval_closing' else 0, clip=rect)
parts.save(root / 'assets/forms/proposal-sections.pdf', garbage=4, deflate=True)

# Remove overlapping contacts from both pages, and fixed blank body rows from page 1.
for index, page in enumerate(pdf):
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            for span in line['spans']:
                is_contact = span['text'].startswith(('Jl.', 'Telp.', 'Fax.', 'E-mail:')) and span['bbox'][1] < 100
                is_body = index == 0 and 260 < span['bbox'][1] < 680
                is_approval_closing = index == 1 and span['text'].startswith('dan layak')
                is_signature_label = index == 1 and 'Nama dan Ttd mahasiswa' in span['text']
                if is_contact or is_body or is_approval_closing or is_signature_label:
                    rect = fitz.Rect(span['bbox'])
                    page.add_redact_annot(rect, fill=False, cross_out=False)
                    removed.append({'page': index, 'rect': list(rect)})
    page.apply_redactions(images=0, graphics=0)
pdf.save(root / 'assets/forms/proposal-template.pdf', garbage=4, deflate=True)
manifest = {
    'sourceFile': 'Formulir pendaftaran ujian proposal Disertasi.doc',
    'sourceSha256': hashlib.sha256((root / 'assets/forms/Formulir pendaftaran ujian proposal Disertasi.doc').read_bytes()).hexdigest(),
    'pageCount': 2,
    'pageSize': list(pdf[0].rect)[2:],
    'renderer': 'LibreOffice 24.2.7; Times New Roman dan Calibri asli',
    'layoutVersion': 3,
    'sections': [{'name': name, 'rect': list(rect)} for name, rect in sections],
    'variableTextRegions': removed,
}
(root / 'assets/forms/proposal-template.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
