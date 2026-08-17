import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ForgotPasswordPage } from './ForgotPasswordPage'
import { ResetCodePage } from './ResetCodePage'
import { ResetPasswordPage } from './ResetPasswordPage'
import { renderRoutes, API_BASE_URL } from '@/test/utils'

let requestedEmail: string | null = null
let verifiedToken: string | null = null
let resetBody: unknown = null

const server = setupServer(
  http.post(`${API_BASE_URL}/auth/forgot-password`, async ({ request }) => {
    const { email } = (await request.json()) as { email: string }
    requestedEmail = email
    if (email === 'nobody@acme.test') {
      return HttpResponse.json(
        { status: 404, code: 'NOT_FOUND', message: 'No account found for this email' },
        { status: 404 },
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),
  http.post(`${API_BASE_URL}/auth/verify-reset-code`, async ({ request }) => {
    const { token } = (await request.json()) as { token: string }
    verifiedToken = token
    if (token !== 'GOOD123') {
      return HttpResponse.json(
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired code' },
        { status: 401 },
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),
  http.post(`${API_BASE_URL}/auth/reset-password`, async ({ request }) => {
    resetBody = await request.json()
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  requestedEmail = null
  verifiedToken = null
  resetBody = null
})

const routes = [
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-code', element: <ResetCodePage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
]

describe('code-based reset flow (3 separate pages)', () => {
  it('tells the user plainly when the email has no account', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/forgot-password')
    await user.type(screen.getByLabelText(/email/i), 'nobody@acme.test')
    await user.click(screen.getByRole('button', { name: /send code/i }))
    expect(await screen.findByText(/no account for this email/i)).toBeInTheDocument()
    // Still on the email page.
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument()
  })

  it('email page → code page, bad code stays with an error', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/forgot-password')
    await user.type(screen.getByLabelText(/email/i), 'ava@acme.test')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    // Code page: shows where the code went, only asks for the code.
    expect(await screen.findByText(/we sent a code to ava@acme.test/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument()
    expect(requestedEmail).toBe('ava@acme.test')

    await user.type(screen.getByLabelText(/code from the email/i), 'WRONG')
    await user.click(screen.getByRole('button', { name: /continue/i }))
    expect(await screen.findByText(/invalid or expired/i)).toBeInTheDocument()
    expect(verifiedToken).toBe('WRONG')
  })

  it('good code → separate new-password page → reset completes', async () => {
    const user = userEvent.setup()
    renderRoutes(routes, '/forgot-password')
    await user.type(screen.getByLabelText(/email/i), 'ava@acme.test')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    await user.type(await screen.findByLabelText(/code from the email/i), 'GOOD123')
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // Password page: no code field here, only the new password.
    expect(await screen.findByLabelText(/new password/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/code from the email/i)).not.toBeInTheDocument()

    await user.type(screen.getByLabelText(/new password/i), 'myOwnSecret9')
    await user.type(screen.getByLabelText(/confirm password/i), 'myOwnSecret9')
    await user.click(screen.getByRole('button', { name: /set new password/i }))

    await screen.findByText(/password reset/i)
    expect(resetBody).toEqual({ token: 'GOOD123', newPassword: 'myOwnSecret9' })
    expect(sessionStorage.getItem('easytask.resetCode')).toBeNull()
  })

  it('deep-linking to later steps without state bounces to the email page', () => {
    renderRoutes(routes, '/reset-password')
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument()
  })
})
