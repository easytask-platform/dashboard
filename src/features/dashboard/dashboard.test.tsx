import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { DashboardPage } from './DashboardPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { renderRoutes, meHandler, signIn, testUser, API_BASE_URL } from '@/test/utils'

const tasksByStatus = { toDo: 8, inProgress: 10, inReview: 4, approved: 15, reopened: 2, cancelled: 1 }

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/dashboard/admin`, () =>
    HttpResponse.json({
      totalUsers: 12,
      activeUsers: 10,
      teamCount: 3,
      projectCount: 4,
      taskCount: 40,
      tasksByStatus,
      overdueTasks: [
        { id: 'task5', title: 'Ship report', projectName: 'Task App', dueDate: '2026-08-01', status: 'IN_PROGRESS' },
      ],
    }),
  ),
  http.get(`${API_BASE_URL}/dashboard/manager`, () =>
    HttpResponse.json({
      managedTaskCount: 20,
      tasksAwaitingReview: 3,
      overdueTaskCount: 2,
      tasksByStatus,
      memberWorkload: [
        { userId: 'u2', fullName: 'Sam Employee', assignedTaskCount: 5, inProgressTaskCount: 2, overdueTaskCount: 1, loggedHours: 12 },
      ],
      projectProgress: [
        {
          projectId: 'p1',
          projectName: 'Task App',
          progressPercent: 45,
          taskCount: 20,
          approvedTaskCount: 9,
          overdueTaskCount: 2,
          estimatedHours: 80,
          loggedHours: 42,
        },
      ],
    }),
  ),
  http.get(`${API_BASE_URL}/reports/workload`, () =>
    HttpResponse.json({
      items: [
        { userId: 'u2', fullName: 'Sam Employee', assignedTaskCount: 5, inProgressTaskCount: 2, overdueTaskCount: 1, loggedHours: 12 },
      ],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    }),
  ),
  http.get(`${API_BASE_URL}/teams`, () =>
    HttpResponse.json({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 1 }),
  ),
  http.get(`${API_BASE_URL}/projects`, () =>
    HttpResponse.json({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 1 }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => server.resetHandlers())

describe('dashboard home', () => {
  it('renders the admin dashboard with stats, flow rail, and overdue table', async () => {
    signIn()
    renderRoutes([{ path: '/', element: <DashboardPage /> }], '/')
    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(screen.getByText('Total users')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getAllByText('In progress')[0]).toHaveTextContent(/10/)
    expect(screen.getByText('Ship report')).toBeInTheDocument()
  })

  it('renders the manager dashboard for a manager', async () => {
    signIn()
    server.use(
      meHandler({ ...testUser, role: 'MANAGER', permissions: ['dashboard:manager', 'task:manage', 'task:review'] }),
    )
    renderRoutes([{ path: '/', element: <DashboardPage /> }], '/')
    expect(await screen.findByText('20')).toBeInTheDocument()
    expect(screen.getByText('Awaiting review')).toBeInTheDocument()
    expect(screen.getByText('Sam Employee')).toBeInTheDocument()
    expect(screen.getByText('9/20')).toBeInTheDocument()
  })
})

describe('reports', () => {
  it('shows the workload report table', async () => {
    signIn()
    renderRoutes([{ path: '/reports', element: <ReportsPage /> }], '/reports')
    expect(await screen.findByText('Sam Employee')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('12')).toBeInTheDocument()
  })
})
