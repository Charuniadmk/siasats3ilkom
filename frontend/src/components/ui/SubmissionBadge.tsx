import type { SubmissionStatus } from '../../features/submissions/submissions-api';
import { statusLabels } from '../../features/submissions/submissions-api';
const colors = {
  DRAFT: 'bg-slate-100 text-slate-600',
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
};
export default function SubmissionBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${colors[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
