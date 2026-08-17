import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { RequireAuth } from '@/app/guards'
import { ResetCodePage } from './ResetCodePage'
import { renderRoutes, meHandler, signIn, testUser, API_BASE_URL } from '@/test/utils'

let requestedEmail: string | null = null

const server = setupServer(
  meHandler({ ...testUser, mustChangePassword: true }),
  http.post(`${API_BASE_URL}/auth/forgot-password`, async ({ request }) => {
    requestedEmail = ((await request.json()) as { email: string }).email
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  requestedEmail = null
})

describe('forced password change (P3-2, code-based)', () => {
  it('blocks the app and one click emails the code to the OWN account', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes(
      [
        {
          element: <RequireAuth />,
          children: [{ path: '/', element: <div>home page</div> }],
        },
        { path: '/reset-code', element: <ResetCodePage /> },
      ],
      '/',
    )

    // Gate visible, app hidden, no password inputs anywhere.
    expect(await screen.findByText(/choose your own password/i)).toBeInTheDocument()
    expect(screen.queryByText('home page')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /email me a code/i }))

    // The code went to the logged-in account without asking for the email.
    expect(await screen.findByText(/we sent a code to ava@acme.test/i)).toBeInTheDocument()
    expect(requestedEmail).toBe('ava@acme.test')
  })
})
