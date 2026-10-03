import {
  DoorOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  UserRoundCheck,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

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
    label: 'Mahasiswa',
    icon: Users,
    section: 'utama',
    children: [
      { label: 'Daftar Mahasiswa', path: '/students' },
      { label: 'Tambah Akun', path: '/students/new' },
    ],
  },
  { label: 'Proposal', path: '/admin/proposals', icon: FileText, section: 'akademik' },
  { label: 'Kualifikasi', path: '/admin/qualifications', icon: GraduationCap, section: 'akademik' },
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

export const studentNavigation: NavigationItem[] = [
  ...navigation.filter((item) => ['Dashboard', 'Dosen', 'Ruangan'].includes(item.label)),
  { label: 'Proposal', path: '/proposal', icon: FileText, section: 'akademik' as const },
  {
    label: 'Kualifikasi',
    path: '/qualification',
    icon: GraduationCap,
    section: 'akademik' as const,
  },
  { label: 'Profil', path: '/profile', icon: UserRound, section: 'master' as const },
].sort(
  (a, b) =>
    ['Dashboard', 'Proposal', 'Kualifikasi', 'Dosen', 'Ruangan', 'Profil'].indexOf(a.label) -
    ['Dashboard', 'Proposal', 'Kualifikasi', 'Dosen', 'Ruangan', 'Profil'].indexOf(b.label),
);
