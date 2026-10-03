import { createBrowserRouter, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import DashboardPage from '../pages/DashboardPage';
import FeaturePlaceholderPage from '../pages/FeaturePlaceholderPage';
import AdminLayout from '../layouts/AdminLayout';
import StudentLayout from '../layouts/StudentLayout';
import RoleLayout from '../layouts/RoleLayout';
import RequireAuth from '../features/auth/RequireAuth';
import StudentSubmissionPage from '../features/submissions/StudentSubmissionPage';
import {
  AdminSubmissionList,
  AdminSubmissionDetail,
} from '../features/submissions/AdminSubmissionPages';
const routeError = (
  <main className="flex min-h-screen items-center justify-center px-6">
    <p role="alert">Halaman tidak dapat ditampilkan.</p>
  </main>
);
export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <RequireAuth>
        <HomePage />
      </RequireAuth>
    ),
    errorElement: routeError,
  },
  {
    path: '/login',
    lazy: async () => ({ Component: (await import('../pages/LoginPage')).default }),
    errorElement: routeError,
  },
  {
    element: (
      <RequireAuth roles={['ADMIN']}>
        <AdminLayout />
      </RequireAuth>
    ),
    errorElement: routeError,
    children: [
      {
        path: '/students',
        lazy: async () => ({ Component: (await import('../pages/StudentsPage')).default }),
      },
      {
        path: '/students/new',
        lazy: async () => ({ Component: (await import('../pages/CreateStudentPage')).default }),
      },
      { path: '/admin/proposals', element: <AdminSubmissionList kind="PROPOSAL" /> },
      { path: '/admin/proposals/:id', element: <AdminSubmissionDetail kind="PROPOSAL" /> },
      { path: '/admin/qualifications', element: <AdminSubmissionList kind="QUALIFICATION" /> },
      {
        path: '/admin/qualifications/:id',
        element: <AdminSubmissionDetail kind="QUALIFICATION" />,
      },
    ],
  },
  {
    element: (
      <RequireAuth>
        <RoleLayout />
      </RequireAuth>
    ),
    errorElement: routeError,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/lecturers', element: <FeaturePlaceholderPage title="Dosen" /> },
      { path: '/rooms', element: <FeaturePlaceholderPage title="Ruangan" /> },
    ],
  },
  {
    element: (
      <RequireAuth roles={['STUDENT']}>
        <StudentLayout />
      </RequireAuth>
    ),
    errorElement: routeError,
    children: [
      {
        path: '/profile',
        lazy: async () => ({ Component: (await import('../pages/StudentProfilePage')).default }),
      },
      { path: '/proposal', element: <StudentSubmissionPage kind="PROPOSAL" /> },
      { path: '/qualification', element: <StudentSubmissionPage kind="QUALIFICATION" /> },
      { path: '/proposal/*', element: <Navigate to="/proposal" replace /> },
      { path: '/qualification/*', element: <Navigate to="/qualification" replace /> },
    ],
  },
]);
