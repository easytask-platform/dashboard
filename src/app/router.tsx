import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppShell } from './AppShell'
import { RedirectIfAuthed, RequireAuth, RequirePermission } from './guards'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterOrganizationPage } from '@/features/auth/RegisterOrganizationPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ProfilePage } from '@/features/auth/ProfilePage'
import { UsersPage } from '@/features/users/UsersPage'
import { RolesPage } from '@/features/roles/RolesPage'
import { TeamsPage } from '@/features/teams/TeamsPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { ProjectDetailsPage } from '@/features/projects/ProjectDetailsPage'
import { TasksPage } from '@/features/tasks/TasksPage'
import { TaskDetailsPage } from '@/features/tasks/TaskDetailsPage'
import { RecurringPage } from '@/features/recurring/RecurringPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'

const router = createBrowserRouter([
  {
    element: <RedirectIfAuthed />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterOrganizationPage /> },
    ],
  },
  // Reachable logged-in too: "I forgot my current password" from the change
  // dialog lands here (the reset revokes all sessions anyway).
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
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
          { path: '/tasks', element: <TasksPage /> },
          {
            element: <RequirePermission permission="recurring:manage" />,
            children: [{ path: '/tasks/recurring', element: <RecurringPage /> }],
          },
          { path: '/tasks/:taskId', element: <TaskDetailsPage /> },
          {
            element: <RequirePermission permission="dashboard:manager" />,
            children: [{ path: '/reports', element: <ReportsPage /> }],
          },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
