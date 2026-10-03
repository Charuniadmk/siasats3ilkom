import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, LoaderCircle, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../features/auth/use-auth';
import { useLogout } from '../../features/auth/use-logout';
import { authErrorMessage } from '../../features/auth/auth-api';
import { findNavigationTrail } from './navigation';

export default function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const session = useAuth();
  const mutation = useLogout();
  const trail = findNavigationTrail(pathname);
  const username = session.data?.username ?? 'Admin';

  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-4 border-b border-border bg-white px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onOpenMenu} aria-label="Buka menu" className="rounded-lg border border-border p-2 text-secondary lg:hidden"><Menu size={20} aria-hidden="true" /></button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{trail.at(-1)?.label ?? 'Dashboard'}</p>
            <nav aria-label="Jejak halaman" className="mt-1 hidden items-center gap-1.5 text-xs text-secondary sm:flex">
              <Link to="/dashboard" className="hover:text-accent">Admin</Link>
              {trail.map((item) => <span key={item.label} className="flex min-w-0 items-center gap-1.5"><ChevronRight size={12} aria-hidden="true" /><span className="truncate">{item.label}</span></span>)}
            </nav>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-2.5"><span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-accent">{username.slice(0, 2).toUpperCase()}</span><div className="hidden sm:block"><p className="text-sm font-semibold">{username}</p><p className="mt-0.5 text-[11px] text-secondary">Admin</p></div></div>
          <div className="h-7 border-l border-border" />
          <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-secondary hover:bg-surface hover:text-primary disabled:opacity-50">
            {mutation.isPending ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <LogOut size={17} aria-hidden="true" />}<span>{mutation.isPending ? 'Memproses...' : 'Keluar'}</span>
          </button>
        </div>
      </header>
      {mutation.isError && <p role="alert" className="border-b border-red-100 bg-red-50 px-8 py-3 text-sm text-error">{authErrorMessage(mutation.error)}</p>}
    </>
  );
}
