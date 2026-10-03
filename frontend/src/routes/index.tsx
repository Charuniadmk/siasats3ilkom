import { createBrowserRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import AdminHomePage from '../pages/AdminHomePage';
import FeaturePlaceholderPage from '../pages/FeaturePlaceholderPage';
import AdminLayout from '../layouts/AdminLayout';
import { flattenNavigation, navigation } from '../components/layout/navigation';
import RequireAuth from '../features/auth/RequireAuth';

const routeError = (
  <main className="flex min-h-screen items-center justify-center px-6">
    <p role="alert">Halaman tidak dapat ditampilkan.</p>
  </main>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RequireAuth><HomePage /></RequireAuth>,
    errorElement: routeError,
  },
  {
    path: '/login',
    lazy: async () => ({ Component: (await import('../pages/LoginPage')).default }),
    errorElement: routeError,
  },
  {
    element: <RequireAuth roles={['ADMIN']}><AdminLayout /></RequireAuth>,
    errorElement: routeError,
    children: [
      { path: '/dashboard', element: <AdminHomePage /> },
      { path: '/students', lazy: async () => ({ Component: (await import('../pages/StudentsPage')).default }) },
      { path: '/students/new', lazy: async () => ({ Component: (await import('../pages/CreateStudentPage')).default }) },
      ...flattenNavigation(navigation)
        .filter((item) => item.path && !['/dashboard', '/students', '/students/new'].includes(item.path))
        .map((item) => ({ path: item.path, element: <FeaturePlaceholderPage title={item.label} /> })),
    ],
  },
]);
