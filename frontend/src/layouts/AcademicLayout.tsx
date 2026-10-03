import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';

export default function AcademicLayout({ role }: { role: 'ADMIN' | 'STUDENT' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = drawer.current;
    if (menuOpen && !dialog?.open) dialog?.showModal();
    if (!menuOpen && dialog?.open) dialog.close();
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onResize = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener('change', onResize);
    return () => desktop.removeEventListener('change', onResize);
  }, []);

  return (
    <div className="min-h-screen bg-surface">
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-accent px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4">Lewati navigasi</a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border lg:block"><Sidebar role={role} /></aside>
      <dialog ref={drawer} aria-label={role === 'STUDENT' ? 'Menu mahasiswa' : 'Menu admin'} onClose={() => setMenuOpen(false)} onCancel={() => setMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }} className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[90vw] border-0 p-0 shadow-xl backdrop:bg-slate-900/30">
        <Sidebar role={role} onNavigate={() => setMenuOpen(false)} onClose={() => setMenuOpen(false)} />
      </dialog>
      <div className="min-w-0 lg:ml-64">
        <Header role={role} onOpenMenu={() => setMenuOpen(true)} />
        <main id="main-content" className="mx-auto w-full max-w-7xl p-5 sm:p-8 lg:p-10"><Outlet /></main>
        <footer className="px-5 pb-6 text-xs text-secondary sm:px-8 lg:px-10">Sistem Manajemen Mahasiswa Doktor</footer>
      </div>
    </div>
  );
}
