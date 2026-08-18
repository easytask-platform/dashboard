import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'
import { SummaryPage } from './SummaryPage'

function task(id: string, title: string, status: string) {
  return {
    id,
    projectId: 'p1',
    projectName: 'Task App',
    title,
    status,
    priority: 'MEDIUM',
    startDate: null,
    dueDate: '2026-08-20',
    estimatedHours: null,
    totalLoggedHours: 0,
    overdue: status !== 'APPROVED',
    assignees: [],
    tags: [],
    blocked: false,
    blockedReason: null,
    checklistDone: 0,
    checklistTotal: 0,
    pinned: false,
  }
}

let lastWeekStart: string | null = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/me/weekly-summary`, ({ request }) => {
    lastWeekStart = new URL(request.url).searchParams.get('weekStart')
    return HttpResponse.json({
      weekStart: lastWeekStart ?? '2026-08-17',
      weekEnd: '2026-08-23',
      completed: [task('t1', 'Shipped login', 'APPROVED')],
      overdue: [task('t2', 'Late migration', 'IN_PROGRESS')],
      upcoming: [],
    })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  lastWeekStart = null
})

describe('weekly summary (P4-9)', () => {
  it('renders the three buckets with their tasks and empty hint', async () => {
    signIn()
    renderRoutes([{ path: '/summary', element: <SummaryPage /> }], '/summary')

    await waitFor(() => expect(screen.getByText('Shipped login')).toBeInTheDocument())
    expect(screen.getByText('Late migration')).toBeInTheDocument()
    expect(screen.getByText('Nothing due this week.')).toBeInTheDocument()
    expect(screen.getByText('2026-08-17 → 2026-08-23')).toBeInTheDocument()
  })

  it('navigates to the previous week with an explicit Monday', async () => {
    signIn()
    renderRoutes([{ path: '/summary', element: <SummaryPage /> }], '/summary')
    await waitFor(() => expect(screen.getByText('Shipped login')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    // weekStart 2026-08-17 minus 7 days = 2026-08-10
    await waitFor(() => expect(lastWeekStart).toBe('2026-08-10'))
  })
})
