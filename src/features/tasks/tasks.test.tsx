import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { targetsFor } from './transitions'
import { TasksPage } from './TasksPage'
import { TaskDetailsPage } from './TaskDetailsPage'
import { renderRoutes, meHandler, signIn, testUser, API_BASE_URL } from '@/test/utils'

describe('targetsFor (status transition rules)', () => {
  const EXECUTE = ['task:execute']
  const REVIEW = ['task:review']
  const CANCEL = ['task:cancel']

  it('lets executors move work forward', () => {
    expect(targetsFor(EXECUTE, 'TO_DO')).toEqual(['IN_PROGRESS'])
    expect(targetsFor(EXECUTE, 'IN_PROGRESS')).toEqual(['IN_REVIEW'])
    expect(targetsFor(EXECUTE, 'REOPENED').sort()).toEqual(['IN_PROGRESS', 'IN_REVIEW'])
    expect(targetsFor(EXECUTE, 'IN_REVIEW')).toEqual([])
    expect(targetsFor(EXECUTE, 'APPROVED')).toEqual([])
  })

  it('lets reviewers decide only on IN_REVIEW', () => {
    expect(targetsFor(REVIEW, 'IN_REVIEW').sort()).toEqual(['APPROVED', 'REOPENED'])
    expect(targetsFor(REVIEW, 'IN_PROGRESS')).toEqual([])
  })

  it('lets cancellers cancel anything not approved/cancelled', () => {
    expect(targetsFor(CANCEL, 'TO_DO')).toEqual(['CANCELLED'])
    expect(targetsFor(CANCEL, 'IN_REVIEW')).toEqual(['CANCELLED'])
    expect(targetsFor(CANCEL, 'APPROVED')).toEqual([])
    expect(targetsFor(CANCEL, 'CANCELLED')).toEqual([])
  })

  it('returns nothing without task permissions', () => {
    expect(targetsFor(['user:read'], 'TO_DO')).toEqual([])
  })
})

const taskListItem = {
  id: 'task1',
  projectId: 'p1',
  projectName: 'Task App',
  title: 'Build login screen',
  status: 'IN_REVIEW',
  priority: 'HIGH',
  startDate: '2026-06-29',
  dueDate: '2026-07-01',
  estimatedHours: 6,
  totalLoggedHours: 2,
  overdue: true,
  assignees: [{ id: 'u2', fullName: 'Sam Employee', avatarUrl: null }],
  tags: [{ id: 'tag1', name: 'Frontend', color: '#5560c1' }],
}

let statusBody: unknown = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/tasks`, ({ request }) => {
    const url = new URL(request.url)
    const items = url.searchParams.get('status') === 'APPROVED' ? [] : [taskListItem]
    return HttpResponse.json({ items, page: 0, size: 20, totalItems: items.length, totalPages: 1 })
  }),
  http.get(`${API_BASE_URL}/tasks/task1`, () =>
    HttpResponse.json({
      ...taskListItem,
      description: 'Create the login screen',
      assignees: [{ id: 'u2', fullName: 'Sam Employee', email: 'sam@acme.test', avatarUrl: null }],
      createdAt: '2026-06-29T10:00:00Z',
      updatedAt: '2026-06-29T12:00:00Z',
    }),
  ),
  http.patch(`${API_BASE_URL}/tasks/task1/status`, async ({ request }) => {
    statusBody = await request.json()
    return HttpResponse.json({})
  }),
  http.get(`${API_BASE_URL}/projects`, () =>
    HttpResponse.json({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 1 }),
  ),
  http.get(`${API_BASE_URL}/me/saved-filters`, () => HttpResponse.json({ items: [] })),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  statusBody = null
})

describe('tasks page', () => {
  it('lists tasks with status, priority, and overdue highlight', async () => {
    signIn()
    renderRoutes([{ path: '/tasks', element: <TasksPage /> }], '/tasks')
    expect(await screen.findByText('Build login screen')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('In review')).toBeInTheDocument()
    expect(within(table).getByText('High')).toBeInTheDocument()
    expect(within(table).getByText('Sam Employee')).toBeInTheDocument()
    expect(within(table).getByText('2 / 6')).toBeInTheDocument()
  })
})

describe('task details', () => {
  it('shows review transitions for a reviewer and sends the note', async () => {
    signIn() // testUser holds task:review + task:cancel + task:execute
    const user = userEvent.setup()
    renderRoutes([{ path: '/tasks/:taskId', element: <TaskDetailsPage /> }], '/tasks/task1')
    expect(await screen.findByText('Build login screen')).toBeInTheDocument()

    // IN_REVIEW + review permission → Approve / Reopen (+ Cancel task)
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reopen/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel task/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit for review/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /reopen/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/note/i), 'Needs polish')
    await user.click(within(dialog).getByRole('button', { name: /confirm/i }))

    expect(await screen.findByText(/task reopened/i)).toBeInTheDocument()
    expect(statusBody).toEqual({ status: 'REOPENED', note: 'Needs polish' })
  })

  it('hides review actions without the permission', async () => {
    signIn()
    server.use(meHandler({ ...testUser, permissions: ['task:execute'] }))
    renderRoutes([{ path: '/tasks/:taskId', element: <TaskDetailsPage /> }], '/tasks/task1')
    expect(await screen.findByText('Build login screen')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel task/i })).not.toBeInTheDocument()
  })
})
