import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { AuthProvider, Can } from '@/features/auth/auth-context'
import { RequireAuth, RequirePermission } from './guards'
import { API_BASE_URL } from '@/lib/api/client'
import { tokenStore } from '@/lib/api/token-store'
import { initI18n } from '@/i18n'
import type { AuthUser } from '@/lib/api/types'

const me: AuthUser = {
  id: 'u1',
  fullName: 'Ava Smith',
  email: 'ava@acme.test',
  role: 'MANAGER',
  roleId: 'r1',
  scope: 'ORGANIZATION',
  permissions: ['task:read'],
  organizationName: 'Acme',
  mustChangePassword: false,
  avatarUrl: null,
}

const server = setupServer(http.get(`${API_BASE_URL}/me`, () => HttpResponse.json(me)))

beforeAll(() => {
  initI18n()
  server.listen({ onUnhandledRequest: 'error' })
})
afterAll(() => server.close())
beforeEach(() => server.resetHandlers())

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <div>login page</div> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/', element: <div>home page</div> },
          {
            element: <RequirePermission permission="user:manage" />,
            children: [{ path: '/admin-only', element: <div>admin page</div> }],
          },
          {
            path: '/tasks',
            element: (
              <div>
                tasks page
                <Can permission="task:read">
                  <button>visible action</button>
                </Can>
                <Can permission="task:review">
                  <button>hidden action</button>
                </Can>
              </div>
            ),
          },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
}

describe('route guards', () => {
  it('redirects unauthenticated users to /login', async () => {
    renderAt('/')
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })

  it('lets a restored session through to the app', async () => {
    tokenStore.set('good-token', 'valid-refresh')
    renderAt('/')
    expect(await screen.findByText('home page')).toBeInTheDocument()
  })

  it('blocks routes behind a missing permission', async () => {
    tokenStore.set('good-token', 'valid-refresh')
    renderAt('/admin-only')
    expect(await screen.findByText(/do not have permission/i)).toBeInTheDocument()
    expect(screen.queryByText('admin page')).not.toBeInTheDocument()
  })

  it('Can renders only for held permissions', async () => {
    tokenStore.set('good-token', 'valid-refresh')
    renderAt('/tasks')
    expect(await screen.findByText('tasks page')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'visible action' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'hidden action' })).not.toBeInTheDocument()
  })
})
