"""Prepare Kualifikasi assets from its PDF export; requires PyMuPDF."""
import hashlib,json,sys
from pathlib import Path
import fitz
root=Path(__file__).resolve().parents[1]
pdf=fitz.open(sys.argv[1])
if len(pdf)!=1: raise ValueError('Form Kualifikasi harus satu halaman.')
# The native header text is drawn behind a grouped image by the converter.
# Preserve its original Lato text, but put it in front of that image.
text_only=fitz.open(stream=pdf.tobytes(),filetype='pdf')
for image in text_only[0].get_images(): text_only[0].delete_image(image[0])
header=fitz.open();page=header.new_page(width=200,height=56)
page.show_pdf_page(page.rect,text_only,0,clip=fitz.Rect(135,10,335,66))
header.save(root/'assets/forms/qualification-header.pdf',garbage=4,deflate=True)
removed=[]
for block in pdf[0].get_text('rawdict')['blocks']:
 for line in block.get('lines',[]):
  for span in line['spans']:
   chars=span['chars'];text=''.join(c['c'] for c in chars)
   indexes=[]
   if '\u2026' in text:
    indexes=[i for i,c in enumerate(chars) if c['c'] in ['\u2026','(',')','.']]
   if text.startswith('Salatiga,') or span['bbox'][1]<100: indexes=list(range(len(chars)))
   for i in indexes:
    rect=fitz.Rect(chars[i]['bbox']);pdf[0].add_redact_annot(rect,fill=False,cross_out=False);removed.append(list(rect))
pdf[0].apply_redactions(images=0,graphics=0)
pdf.save(root/'assets/forms/qualification-template.pdf',garbage=4,deflate=True)
manifest={'sourceFile':'FORM UJIAN KUALIFIKASI.docx','sourceSha256':hashlib.sha256((root/'assets/forms/FORM UJIAN KUALIFIKASI.docx').read_bytes()).hexdigest(),'pageCount':1,'renderer':'LibreOffice 24.2.7; Calibri dan Lato asli','variableTextRegions':removed}
(root/'assets/forms/qualification-template.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
