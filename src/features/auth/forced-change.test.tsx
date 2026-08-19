import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { RequireAuth } from '@/app/guards'
import { renderRoutes, signIn, testUser, API_BASE_URL } from '@/test/utils'

let lastNewPassword: string | null = null
let changed = false

const server = setupServer(
  // /me reports the flag until the user sets their own password.
  http.get(`${API_BASE_URL}/me`, () =>
    HttpResponse.json({ ...testUser, mustChangePassword: !changed }),
  ),
  http.post(`${API_BASE_URL}/auth/first-login-password`, async ({ request }) => {
    lastNewPassword = ((await request.json()) as { newPassword: string }).newPassword
    changed = true
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  lastNewPassword = null
  changed = false
})

describe('forced password change (P3-2)', () => {
  it('blocks the app until the user sets their own password directly', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes(
      [
        {
          element: <RequireAuth />,
          children: [{ path: '/', element: <div>home page</div> }],
        },
      ],
      '/',
    )

    // Gate visible, app hidden.
    expect(await screen.findByText(/choose your own password/i)).toBeInTheDocument()
    expect(screen.queryByText('home page')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('New password'), 'myBrandNew9')
    await user.type(screen.getByLabelText('Confirm password'), 'myBrandNew9')
    await user.click(screen.getByRole('button', { name: /set new password/i }))

    // No code was involved; the new password was posted and the app unlocks.
    expect(await screen.findByText('home page')).toBeInTheDocument()
    expect(lastNewPassword).toBe('myBrandNew9')
  })

  it('shows the mismatch error and does not submit when passwords differ', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes(
      [{ element: <RequireAuth />, children: [{ path: '/', element: <div>home page</div> }] }],
      '/',
    )

    await screen.findByText(/choose your own password/i)
    await user.type(screen.getByLabelText('New password'), 'myBrandNew9')
    await user.type(screen.getByLabelText('Confirm password'), 'different9')
    await user.click(screen.getByRole('button', { name: /set new password/i }))

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(lastNewPassword).toBeNull()
  })
})
