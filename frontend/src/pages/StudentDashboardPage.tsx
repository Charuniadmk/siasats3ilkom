import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '../components/common/PageHeader';
import SubmissionBadge from '../components/ui/SubmissionBadge';
import { getSubmission, type SubmissionKind } from '../features/submissions/submissions-api';
import { authErrorMessage } from '../features/auth/auth-api';
import { useSessionExpiry } from '../features/auth/use-session-expiry';
function Summary({ kind }: { kind: SubmissionKind }) {
  const query = useQuery({ queryKey: ['submission', kind], queryFn: () => getSubmission(kind) });
  useSessionExpiry(query.error);
  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg font-semibold">{kind === 'PROPOSAL' ? 'Proposal' : 'Kualifikasi'}</h2>
      <div className="mt-4">
        {query.isPending ? (
          <p role="status">Memuat status...</p>
        ) : query.isError ? (
          <p role="alert" className="text-sm text-error">
            {authErrorMessage(query.error)}
          </p>
        ) : (
          <SubmissionBadge status={query.data.status} />
        )}
      </div>
      <Link
        className="mt-6 inline-block text-sm text-accent"
        to={kind === 'PROPOSAL' ? '/proposal' : '/qualification'}
      >
        Buka Pengajuan
      </Link>
    </section>
  );
}
export default function StudentDashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Pantau pengajuan akademik dan kelengkapan dokumen Anda."
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <Summary kind="PROPOSAL" />
        <Summary kind="QUALIFICATION" />
      </div>
    </>
  );
}
