import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, GraduationCap, ShieldCheck, X } from "lucide-react";
import {
  flattenNavigation,
  navigation,
  type NavigationItem,
} from "./navigation";

function MenuItem({
  item,
  depth = 0,
  onNavigate,
}: {
  item: NavigationItem;
  depth?: number;
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const active = flattenNavigation([item]).some(
    (entry) => entry.path === pathname,
  );
  const open = expanded ?? active;
  const Icon = item.icon;
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {Icon && <Icon size={18} strokeWidth={1.7} aria-hidden="true" />}
        <span>{item.label}</span>
      </span>
    </>
  );
  const classes = `flex min-w-0 flex-1 items-center rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${depth ? "leading-5" : "font-medium"}`;

  return (
    <li>
      <div className="flex items-center gap-1">
        {item.path ? (
          <NavLink
            to={item.path}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              `${classes} ${isActive ? "bg-blue-50 font-semibold text-accent" : "text-secondary hover:bg-surface hover:text-primary"}`
            }
          >
            {content}
          </NavLink>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(!open)}
            aria-expanded={open}
            className={`${classes} justify-between gap-2 ${active ? "text-accent" : "text-secondary hover:bg-surface hover:text-primary"}`}
          >
            {content}
            <ChevronDown
              size={15}
              className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>
        )}
        {item.path && item.children && (
          <button
            type="button"
            aria-label={`${open ? "Tutup" : "Buka"} submenu ${item.label}`}
            aria-expanded={open}
            onClick={() => setExpanded(!open)}
            className="rounded-md p-2 text-secondary hover:bg-surface"
          >
            <ChevronDown
              size={14}
              className={open ? "rotate-180" : ""}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
      {item.children && open && (
        <ul className="my-1 ml-5 space-y-1 border-l border-border pl-2">
          {item.children.map((child) => (
            <MenuItem
              key={`${child.label}-${pathname}`}
              item={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({
  onNavigate,
  onClose,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const { pathname } = useLocation();
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-border px-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
          <GraduationCap size={23} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold">Sistem Akademik</p>
          <p className="mt-0.5 text-xs text-secondary">Program Doktor</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="ml-auto rounded-lg p-1.5 text-secondary hover:bg-surface"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>
      <nav
        aria-label="Navigasi admin"
        className="flex-1 overflow-y-auto px-4 py-6"
      >
        {(
          [
            { key: "utama", label: "Utama" },
            { key: "akademik", label: "Akademik" },
            { key: "master", label: "Data master" },
          ] as const
        ).map((section) => (
          <div key={section.key} className="mb-7 last:mb-0">
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
              {section.label}
            </p>
            <ul className="space-y-1">
              {navigation
                .filter((item) => item.section === section.key)
                .map((item) => (
                  <MenuItem
                    key={`${item.label}-${pathname}`}
                    item={item}
                    onNavigate={onNavigate}
                  />
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="m-4 flex shrink-0 items-center gap-3 rounded-xl border border-border bg-surface p-3.5">
        <ShieldCheck size={18} className="text-accent" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold">Ruang administrasi</p>
          <p className="mt-1 text-[11px] text-secondary">
            Manajemen mahasiswa doktor
          </p>
        </div>
      </div>
    </div>
  );
}
