import { createBrowserRouter } from 'react-router-dom';
import SetupPage from '../pages/SetupPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <SetupPage />,
    errorElement: (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p role="alert">Halaman tidak dapat ditampilkan.</p>
      </main>
    ),
  },
]);
