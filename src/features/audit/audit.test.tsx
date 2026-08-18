import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'
import { AuditPage } from './AuditPage'

let lastEventType: string | null = null

const events = [
  {
    id: 'a1',
    eventType: 'ROLE_CHANGED',
    actor: { id: 'u1', fullName: 'Ava Admin', avatarUrl: null },
    targetUser: { id: 'u2', fullName: 'Sam Employee', avatarUrl: null },
    detail: 'EMPLOYEE → MANAGER',
    createdAt: '2026-08-18T09:00:00Z',
  },
  {
    id: 'a2',
    eventType: 'USER_DEACTIVATED',
    actor: { id: 'u1', fullName: 'Ava Admin', avatarUrl: null },
    targetUser: { id: 'u3', fullName: 'Old Account', avatarUrl: null },
    detail: null,
    createdAt: '2026-08-18T08:00:00Z',
  },
]

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/users`, () =>
    HttpResponse.json({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 1 }),
  ),
  http.get(`${API_BASE_URL}/audit-events`, ({ request }) => {
    lastEventType = new URL(request.url).searchParams.get('eventType')
    const items = lastEventType ? events.filter((e) => e.eventType === lastEventType) : events
    return HttpResponse.json({ items, page: 0, size: 20, totalItems: items.length, totalPages: 1 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  lastEventType = null
})

describe('audit log (P4-11)', () => {
  it('renders audit events with actor, target and detail', async () => {
    signIn()
    renderRoutes([{ path: '/audit', element: <AuditPage /> }], '/audit')

    await waitFor(() => expect(screen.getByText('EMPLOYEE → MANAGER')).toBeInTheDocument())
    // "Role changed"/"User deactivated" also appear as filter <option>s, so scope to badges via getAllByText
    expect(screen.getAllByText('Role changed').length).toBeGreaterThan(0)
    expect(screen.getAllByText('User deactivated').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ava Admin').length).toBeGreaterThan(0)
    expect(screen.getByText('Sam Employee')).toBeInTheDocument()
  })

  it('filters by event type through the API', async () => {
    signIn()
    renderRoutes([{ path: '/audit', element: <AuditPage /> }], '/audit')
    await waitFor(() => expect(screen.getByText('EMPLOYEE → MANAGER')).toBeInTheDocument())

    await userEvent.selectOptions(screen.getByLabelText('Event'), 'USER_DEACTIVATED')
    await waitFor(() => expect(lastEventType).toBe('USER_DEACTIVATED'))
    await waitFor(() => expect(screen.queryByText('EMPLOYEE → MANAGER')).not.toBeInTheDocument())
  })
})
