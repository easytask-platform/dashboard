import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { RequireAuth } from '@/app/guards'
import { renderRoutes, meHandler, signIn, testUser, API_BASE_URL } from '@/test/utils'

let changedBody: unknown = null

const server = setupServer(
  meHandler({ ...testUser, mustChangePassword: true }),
  http.patch(`${API_BASE_URL}/me/password`, async ({ request }) => {
    changedBody = await request.json()
    return new HttpResponse(null, { status: 204 })
  }),
  http.post(`${API_BASE_URL}/auth/login`, () =>
    HttpResponse.json({
      user: { ...testUser, mustChangePassword: false },
      accessToken: 'fresh-at',
      refreshToken: 'fresh-rt',
    }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  changedBody = null
})

describe('forced password change (P3-2)', () => {
  it('blocks the whole app until the admin-set password is replaced', async () => {
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

    await user.type(screen.getByLabelText(/current password/i), 'tempPass123')
    await user.type(screen.getByLabelText(/new password/i), 'myOwnSecret9')
    await user.type(screen.getByLabelText(/confirm password/i), 'myOwnSecret9')
    await user.click(screen.getByRole('button', { name: /set password and continue/i }))

    // After the change + relogin the app unblocks.
    expect(await screen.findByText('home page')).toBeInTheDocument()
    expect(changedBody).toEqual({ currentPassword: 'tempPass123', newPassword: 'myOwnSecret9' })
  })
})
