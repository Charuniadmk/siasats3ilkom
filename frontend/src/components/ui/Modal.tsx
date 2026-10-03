import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    return () => { dialog?.close(); if (previous instanceof HTMLElement) previous.focus(); };
  }, []);
  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-0 text-primary shadow-xl backdrop:bg-slate-900/35">
    <div className="flex items-center justify-between border-b border-border px-6 py-5"><h2 className="text-lg font-semibold">{title}</h2><button type="button" aria-label="Tutup dialog" disabled={busy} onClick={onClose} className="rounded-lg p-2 text-secondary hover:bg-surface"><X size={18} /></button></div>
    <div className="p-6">{children}</div>
  </dialog>;
}

