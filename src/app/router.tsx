import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppShell } from './AppShell'
import { RedirectIfAuthed, RequireAuth, RequirePermission } from './guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterOrganizationPage } from '@/features/auth/RegisterOrganizationPage'
import { ProfilePage } from '@/features/auth/ProfilePage'
import { UsersPage } from '@/features/users/UsersPage'
import { RolesPage } from '@/features/roles/RolesPage'
import { TeamsPage } from '@/features/teams/TeamsPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { ProjectDetailsPage } from '@/features/projects/ProjectDetailsPage'

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
          {
            element: <RequirePermission permission="user:read" />,
            children: [{ path: '/users', element: <UsersPage /> }],
          },
          {
            element: <RequirePermission permission="role:manage" />,
            children: [{ path: '/roles', element: <RolesPage /> }],
          },
          {
            element: <RequirePermission permission="team:read" />,
            children: [{ path: '/teams', element: <TeamsPage /> }],
          },
          { path: '/projects', element: <ProjectsPage /> },
          { path: '/projects/:projectId', element: <ProjectDetailsPage /> },
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
