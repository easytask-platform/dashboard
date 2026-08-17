import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { renderRoutes, API_BASE_URL } from '@/test/utils'

let requestedEmail: unknown = null
let resetBody: unknown = null

const server = setupServer(
  http.post(`${API_BASE_URL}/auth/forgot-password`, async ({ request }) => {
    requestedEmail = await request.json()
    return new HttpResponse(null, { status: 204 })
  }),
  http.post(`${API_BASE_URL}/auth/reset-password`, async ({ request }) => {
    resetBody = (await request.json()) as { token: string }
    if ((resetBody as { token: string }).token === 'bad-code') {
      return HttpResponse.json(
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired reset code' },
        { status: 401 },
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  requestedEmail = null
  resetBody = null
})

describe('forgot password (dashboard)', () => {
  it('requests a code then resets with it', async () => {
    const user = userEvent.setup()
    renderRoutes(
      [
        { path: '/forgot-password', element: <ForgotPasswordPage /> },
        { path: '/login', element: <div>login page</div> },
      ],
      '/forgot-password',
    )

    await user.type(screen.getByLabelText(/email/i), 'ava@acme.test')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    expect(await screen.findByLabelText(/code from the email/i)).toBeInTheDocument()
    expect(requestedEmail).toEqual({ email: 'ava@acme.test' })

    await user.type(screen.getByLabelText(/code from the email/i), 'ABC123 ')
    await user.type(screen.getByLabelText(/new password/i), 'myOwnSecret9')
    await user.type(screen.getByLabelText(/confirm password/i), 'myOwnSecret9')
    await user.click(screen.getByRole('button', { name: /set new password/i }))

    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(resetBody).toEqual({ token: 'ABC123', newPassword: 'myOwnSecret9' })
  })

  it('surfaces an invalid-code error and stays on the form', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/forgot-password', element: <ForgotPasswordPage /> }], '/forgot-password')

    await user.type(screen.getByLabelText(/email/i), 'ava@acme.test')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    await user.type(await screen.findByLabelText(/code from the email/i), 'bad-code')
    await user.type(screen.getByLabelText(/new password/i), 'myOwnSecret9')
    await user.type(screen.getByLabelText(/confirm password/i), 'myOwnSecret9')
    await user.click(screen.getByRole('button', { name: /set new password/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid or expired/i)
  })
})
