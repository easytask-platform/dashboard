/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { AuthProvider } from '@/features/auth/auth-context'
import { ToastProvider } from '@/components/ui/Toast'
import { API_BASE_URL } from '@/lib/api/client'
import { tokenStore } from '@/lib/api/token-store'
import type { AuthUser } from '@/lib/api/types'
import i18n, { initI18n } from '@/i18n'

if (!i18n.isInitialized) initI18n()

export const testUser: AuthUser = {
  id: 'u1',
  fullName: 'Ava Admin',
  email: 'ava@acme.test',
  role: 'ORGANIZATION_ADMIN',
  roleId: 'r1',
  scope: 'ORGANIZATION',
  // The full real catalog — matches an ORGANIZATION_ADMIN.
  permissions: [
    'dashboard:admin',
    'dashboard:manager',
    'project:manage',
    'recurring:manage',
    'role:manage',
    'task:cancel',
    'task:execute',
    'task:manage',
    'task:review',
    'team:manage',
    'team:read',
    'user:manage',
    'user:read',
  ],
  organizationName: 'Acme',
  mustChangePassword: false,
  avatarUrl: null,
}

/** MSW handler for GET /me — pair with signIn() for authenticated renders. */
export function meHandler(user: AuthUser = testUser) {
  return http.get(`${API_BASE_URL}/me`, () => HttpResponse.json(user))
}

export function signIn() {
  tokenStore.set('good-token', 'valid-refresh')
}

export function renderRoutes(routes: RouteObject[], initialPath = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

export function withProviders(ui: ReactNode, initialPath = '/') {
  return renderRoutes([{ path: initialPath, element: ui }], initialPath)
}

export { API_BASE_URL }
