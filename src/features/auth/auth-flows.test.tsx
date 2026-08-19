import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { LoginPage } from './LoginPage'
import { RegisterOrganizationPage } from './RegisterOrganizationPage'
import { ProfilePage } from './ProfilePage'
import { tokenStore } from '@/lib/api/token-store'
import { renderRoutes, meHandler, signIn, testUser, API_BASE_URL } from '@/test/utils'

let forgotEmail: string | null = null

const server = setupServer(
  meHandler(),
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string }
    if (email === 'ava@acme.test' && password === 'password123') {
      return HttpResponse.json({ user: testUser, accessToken: 'at', refreshToken: 'rt' })
    }
    return HttpResponse.json(
      { status: 401, code: 'UNAUTHORIZED', message: 'Invalid credentials' },
      { status: 401 },
    )
  }),
  http.post(`${API_BASE_URL}/auth/register-organization`, () =>
    HttpResponse.json(
      { status: 409, code: 'CONFLICT', message: 'Email already in use' },
      { status: 409 },
    ),
  ),
  http.post(`${API_BASE_URL}/auth/forgot-password`, async ({ request }) => {
    forgotEmail = ((await request.json()) as { email: string }).email
    return new HttpResponse(null, { status: 204 })
  }),
  http.post(`${API_BASE_URL}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  forgotEmail = null
})

describe('login', () => {
  it('stores tokens and navigates home on success', async () => {
    const user = userEvent.setup()
    renderRoutes(
      [
        { path: '/login', element: <LoginPage /> },
        { path: '/', element: <div>home page</div> },
      ],
      '/login',
    )
    await user.type(screen.getByLabelText(/email/i), 'ava@acme.test')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    expect(await screen.findByText('home page')).toBeInTheDocument()
    expect(tokenStore.accessToken).toBe('at')
    expect(tokenStore.refreshToken).toBe('rt')
  })

  it('shows the API message on bad credentials', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/login', element: <LoginPage /> }], '/login')
    await user.type(screen.getByLabelText(/email/i), 'ava@acme.test')
    await user.type(screen.getByLabelText('Password'), 'nope-nope')
    await user.click(screen.getByRole('button', { name: /log in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials')
    expect(tokenStore.accessToken).toBeNull()
  })
})

describe('register organization', () => {
  it('validates password confirmation client-side', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/register', element: <RegisterOrganizationPage /> }], '/register')
    await user.type(screen.getByLabelText(/organization name/i), 'Acme')
    await user.type(screen.getByLabelText(/admin full name/i), 'Ava')
    await user.type(screen.getByLabelText(/email/i), 'ava@acme.test')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'different1')
    await user.click(screen.getByRole('button', { name: /create organization/i }))
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
  })

  it('surfaces API conflict errors', async () => {
    const user = userEvent.setup()
    renderRoutes([{ path: '/register', element: <RegisterOrganizationPage /> }], '/register')
    await user.type(screen.getByLabelText(/organization name/i), 'Acme')
    await user.type(screen.getByLabelText(/admin full name/i), 'Ava')
    await user.type(screen.getByLabelText(/email/i), 'taken@acme.test')
    await user.type(screen.getByLabelText(/^password/i), 'password123')
    await user.type(screen.getByLabelText(/confirm password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create organization/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Email already in use')
  })
})

describe('profile', () => {
  it('change password sends the code to the OWN email and goes to the code page', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes(
      [
        { path: '/profile', element: <ProfilePage /> },
        { path: '/reset-code', element: <div>code page</div> },
      ],
      '/profile',
    )
    expect(await screen.findByText('ava@acme.test')).toBeInTheDocument()

    // One click — no email entry, no current password, no dialog.
    await user.click(screen.getByRole('button', { name: /change password/i }))
    expect(await screen.findByText('code page')).toBeInTheDocument()
    expect(forgotEmail).toBe('ava@acme.test')
  })

  it('logout confirms, revokes, clears tokens, and redirects', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes(
      [
        { path: '/profile', element: <ProfilePage /> },
        { path: '/login', element: <div>login page</div> },
      ],
      '/profile',
    )
    await screen.findByText('ava@acme.test')
    await user.click(screen.getByRole('button', { name: /log out/i }))
    await user.click(screen.getAllByRole('button', { name: /log out/i })[1]!)
    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(tokenStore.refreshToken).toBeNull()
  })
})
