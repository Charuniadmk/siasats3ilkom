import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import {
  fetchDocument,
  downloadDocument,
  type SubmissionDocument,
  type SubmissionKind,
} from '../../features/submissions/submissions-api';
import { authErrorMessage } from '../../features/auth/auth-api';
import { useSessionExpiry } from '../../features/auth/use-session-expiry';
export default function PdfPreview({
  kind,
  document,
  submissionId,
  onClose,
}: {
  kind: SubmissionKind;
  document: SubmissionDocument;
  submissionId?: string;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ['document', document.id, document.updatedAt],
    queryFn: () => fetchDocument(kind, document, submissionId),
    gcTime: 0,
  });
  const frame = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState('');
  useSessionExpiry(query.error);
  useEffect(() => {
    if (!query.data) return;
    const objectUrl = URL.createObjectURL(query.data);
    if (frame.current) frame.current.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [query.data]);
  return (
    <Modal title="Pratinjau PDF" onClose={onClose} wide>
      <p className="mb-3 break-all text-sm text-secondary">{document.fileName}</p>
      {query.isPending && <p role="status">Memuat PDF...</p>}
      {(query.isError || error) && (
        <p role="alert" className="text-sm text-error">
          {error || authErrorMessage(query.error)}
        </p>
      )}
      {query.data && (
        <>
          <iframe
            title={`Pratinjau ${document.fileName}`}
            ref={frame}
            className="h-[65dvh] w-full rounded-lg border border-border"
          />
          <p className="mt-2 text-xs text-secondary">
            Jika perangkat tidak mendukung pratinjau, gunakan tombol Unduh PDF.
          </p>
        </>
      )}
      <div className="mt-4 flex justify-end gap-4">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-sm">
          <X size={16} />
          Tutup Pratinjau
        </button>
        <button
          type="button"
          className="text-sm font-medium text-accent"
          onClick={() => {
            void downloadDocument(kind, document, submissionId).catch((e: unknown) =>
              setError(authErrorMessage(e)),
            );
          }}
        >
          Unduh PDF
        </button>
      </div>
    </Modal>
  );
}
