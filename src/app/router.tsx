import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppShell } from './AppShell'
import { RedirectIfAuthed, RequireAuth } from './guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterOrganizationPage } from '@/features/auth/RegisterOrganizationPage'
import { ProfilePage } from '@/features/auth/ProfilePage'

function Placeholder({ title }: { title: string }) {
  return <h1 className="text-xl font-semibold">{title}</h1>
}

const router = createBrowserRouter([
  {
    element: <RedirectIfAuthed />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterOrganizationPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <Placeholder title="Dashboard" /> },
          { path: '/users', element: <Placeholder title="Users" /> },
          { path: '/roles', element: <Placeholder title="Roles" /> },
          { path: '/teams', element: <Placeholder title="Teams" /> },
          { path: '/projects', element: <Placeholder title="Projects" /> },
          { path: '/tasks', element: <Placeholder title="Tasks" /> },
          { path: '/reports', element: <Placeholder title="Reports" /> },
          { path: '/notifications', element: <Placeholder title="Notifications" /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
