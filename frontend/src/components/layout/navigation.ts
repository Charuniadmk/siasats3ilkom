import { DoorOpen, FileText, GraduationCap, LayoutDashboard, UserRoundCheck, Users, type LucideIcon } from 'lucide-react';

export interface NavigationItem {
  label: string;
  path?: string;
  icon?: LucideIcon;
  section?: 'utama' | 'akademik' | 'master';
  children?: NavigationItem[];
}

export const navigation: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, section: 'utama' },
  {
    label: 'Mahasiswa', icon: Users, section: 'utama', children: [
      { label: 'Daftar Mahasiswa', path: '/students' },
      { label: 'Tambah Akun', path: '/students/new' },
    ],
  },
  {
    label: 'Proposal', icon: FileText, section: 'akademik', children: [
      { label: 'Isi Form', path: '/proposal/form' },
      { label: 'LOA Conference', path: '/proposal/loa-conference', children: [
        { label: 'Kuitansi Pembayaran', path: '/proposal/loa-conference/payment-receipt' },
      ] },
      { label: 'Draft Proposal', path: '/proposal/draft' },
      { label: 'Lulus Ujian', path: '/proposal/passed-exam', children: [
        { label: 'Transkrip Nilai', path: '/proposal/passed-exam/transcript' },
      ] },
    ],
  },
  {
    label: 'Kualifikasi', icon: GraduationCap, section: 'akademik', children: [
      { label: 'Isi Form Kualifikasi', path: '/qualification/form' },
      { label: 'Draft Artikel yang Dipublish', path: '/qualification/article' },
    ],
  },
  { label: 'Dosen', path: '/lecturers', icon: UserRoundCheck, section: 'master' },
  { label: 'Ruangan', path: '/rooms', icon: DoorOpen, section: 'master' },
];

export function flattenNavigation(items: NavigationItem[]): NavigationItem[] {
  return items.flatMap((item) => [item, ...flattenNavigation(item.children ?? [])]);
}

export function findNavigationTrail(path: string, items = navigation): NavigationItem[] {
  for (const item of items) {
    if (item.path === path) return [item];
    const children = findNavigationTrail(path, item.children ?? []);
    if (children.length) return [item, ...children];
  }
  return [];
}
