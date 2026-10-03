import { generateProposalTemplatePdf } from './proposal-template.pdf.js';
import { generateQualificationTemplatePdf } from './qualification-template.pdf.js';
import type { AcademicForm } from './submissions.schema.js';

export function withGenerationMetadata(form: AcademicForm, generatedAt = new Date()): AcademicForm {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(generatedAt);
  const part = (type: string) => parts.find((value) => value.type === type)!.value;
  return { ...form, city: 'Salatiga', formDate: [part('year'), part('month'), part('day')].join('-') };
}

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
  generatedAt = new Date(),
) {
  form = withGenerationMetadata(form, generatedAt);
  return kind === 'PROPOSAL'
    ? generateProposalTemplatePdf(form, student, signature)
    : generateQualificationTemplatePdf(form, student, signature);
}
