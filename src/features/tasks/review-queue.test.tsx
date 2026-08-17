import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { ReviewQueuePage } from './ReviewQueuePage'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'

let statusBody: unknown = null
let requestedStatusFilter: string | null = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/tasks`, ({ request }) => {
    requestedStatusFilter = new URL(request.url).searchParams.get('status')
    return HttpResponse.json({
      items: [
        {
          id: 'task1',
          projectId: 'p1',
          projectName: 'Task App',
          title: 'Rebuild navigation',
          status: 'IN_REVIEW',
          priority: 'HIGH',
          startDate: null,
          dueDate: '2026-08-10',
          estimatedHours: null,
          totalLoggedHours: 2,
          overdue: true,
          assignees: [{ id: 'u2', fullName: 'Sam Employee' }],
        },
      ],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    })
  }),
  http.patch(`${API_BASE_URL}/tasks/task1/status`, async ({ request }) => {
    statusBody = await request.json()
    return HttpResponse.json({})
  }),
  http.get(`${API_BASE_URL}/projects`, () =>
    HttpResponse.json({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 1 }),
  ),
  http.get(`${API_BASE_URL}/users`, () =>
    HttpResponse.json({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 1 }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  statusBody = null
  requestedStatusFilter = null
})

describe('review queue (P3-5)', () => {
  it('lists only in-review tasks and approves inline with a note', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/review', element: <ReviewQueuePage /> }], '/review')

    expect(await screen.findByText('Rebuild navigation')).toBeInTheDocument()
    expect(requestedStatusFilter).toBe('IN_REVIEW')
    expect(screen.getByText('Sam Employee')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /approve/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/approve — rebuild navigation/i)).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/note/i), 'Great work')
    await user.click(within(dialog).getByRole('button', { name: /confirm/i }))

    expect(await screen.findByText(/task approved/i)).toBeInTheDocument()
    expect(statusBody).toEqual({ status: 'APPROVED', note: 'Great work' })
  })

  it('reopens inline as well', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/review', element: <ReviewQueuePage /> }], '/review')
    await screen.findByText('Rebuild navigation')

    await user.click(screen.getByRole('button', { name: /reopen/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /confirm/i }))
    expect(await screen.findByText(/task reopened/i)).toBeInTheDocument()
    expect(statusBody).toEqual({ status: 'REOPENED' })
  })
})
