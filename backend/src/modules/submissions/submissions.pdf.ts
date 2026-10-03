import { generateProposalTemplatePdf } from './proposal-template.pdf.js';
import { generateQualificationTemplatePdf } from './qualification-template.pdf.js';
import type { AcademicForm } from './submissions.schema.js';

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
  return kind === 'PROPOSAL'
    ? generateProposalTemplatePdf(form, student, signature)
    : generateQualificationTemplatePdf(form, student, signature);
}
