import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderRoutes, meHandler, signIn, testUser, API_BASE_URL } from '@/test/utils'
import { ProfilePage } from './ProfilePage'
import { Avatar } from '@/components/ui/Avatar'

let uploaded = false

const server = setupServer(
  http.get(`${API_BASE_URL}/me`, () =>
    HttpResponse.json({
      ...testUser,
      avatarUrl: uploaded ? '/api/v1/users/u1/avatar?v=avatars/x.png' : null,
    }),
  ),
  http.put(`${API_BASE_URL}/me/avatar`, () => {
    uploaded = true
    return HttpResponse.json({ avatarUrl: '/api/v1/users/u1/avatar?v=avatars/x.png' })
  }),
  http.get(`${API_BASE_URL}/users/u1/avatar`, () =>
    HttpResponse.arrayBuffer(new ArrayBuffer(4), { headers: { 'Content-Type': 'image/png' } }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  uploaded = false
})

describe('avatars (P4-1)', () => {
  it('shows initials fallback when no avatar is set', async () => {
    signIn()
    renderRoutes(
      [{ path: '/a', element: <Avatar person={{ id: 'u9', fullName: 'Sam Employee', avatarUrl: null }} /> }],
      '/a',
    )
    await waitFor(() => expect(screen.getByText('SE')).toBeInTheDocument())
  })

  it('uploads a new profile photo and refreshes the user', async () => {
    signIn()
    renderRoutes([{ path: '/profile', element: <ProfilePage /> }], '/profile')
    const changeButton = await screen.findByRole('button', { name: 'Change photo' })

    const input = screen.getByLabelText('Change photo', { selector: 'input' })
    await userEvent.upload(input as HTMLInputElement, new File(['png'], 'me.png', { type: 'image/png' }))

    await waitFor(() => expect(screen.getByText('Profile photo updated')).toBeInTheDocument())
    // after refreshUser the remove button appears (avatarUrl now set)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remove photo' })).toBeInTheDocument())
    expect(changeButton).toBeEnabled()
  })

  it('surfaces the API validation message on a rejected upload', async () => {
    server.use(
      http.put(`${API_BASE_URL}/me/avatar`, () =>
        HttpResponse.json(
          { status: 400, code: 'VALIDATION_ERROR', message: 'Avatar must be 2 MB or smaller' },
          { status: 400 },
        ),
      ),
      meHandler(),
    )
    signIn()
    renderRoutes([{ path: '/profile', element: <ProfilePage /> }], '/profile')
    await screen.findByRole('button', { name: 'Change photo' })

    const input = screen.getByLabelText('Change photo', { selector: 'input' })
    await userEvent.upload(input as HTMLInputElement, new File(['big'], 'big.png', { type: 'image/png' }))

    await waitFor(() => expect(screen.getByText('Avatar must be 2 MB or smaller')).toBeInTheDocument())
  })
})
