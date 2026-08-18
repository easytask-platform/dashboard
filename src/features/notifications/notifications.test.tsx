import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { NotificationsPage } from './NotificationsPage'
import { KanbanView } from '@/features/tasks/KanbanView'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'
import type { TaskListItem } from '@/features/tasks/api'

let markedRead: string | null = null
let markedAllRead = false

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/notifications`, () =>
    HttpResponse.json({
      items: [
        {
          id: 'n1',
          title: 'Task assigned',
          message: 'You were assigned to Build login screen.',
          relatedTaskId: 'task1',
          read: false,
          createdAt: '2026-08-15T09:00:00Z',
        },
        {
          id: 'n2',
          title: 'Task approved',
          message: 'Your task was approved.',
          relatedTaskId: null,
          read: true,
          createdAt: '2026-08-14T09:00:00Z',
        },
      ],
      page: 0,
      size: 20,
      totalItems: 2,
      totalPages: 1,
    }),
  ),
  http.patch(`${API_BASE_URL}/notifications/n1/read`, () => {
    markedRead = 'n1'
    return new HttpResponse(null, { status: 204 })
  }),
  http.patch(`${API_BASE_URL}/notifications/read-all`, () => {
    markedAllRead = true
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  markedRead = null
  markedAllRead = false
})

describe('notifications', () => {
  it('lists notifications; opening an unread one marks it read and navigates', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes(
      [
        { path: '/notifications', element: <NotificationsPage /> },
        { path: '/tasks/:taskId', element: <div>task page</div> },
      ],
      '/notifications',
    )
    expect(await screen.findByText('Task assigned')).toBeInTheDocument()
    expect(screen.getByText('Task approved')).toBeInTheDocument()

    await user.click(screen.getByText('Task assigned'))
    expect(await screen.findByText('task page')).toBeInTheDocument()
    expect(markedRead).toBe('n1')
  })

  it('marks everything read', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/notifications', element: <NotificationsPage /> }], '/notifications')
    await screen.findByText('Task assigned')
    await user.click(screen.getByRole('button', { name: /mark all read/i }))
    expect(markedAllRead).toBe(true)
  })
})

describe('kanban view', () => {
  const tasks: TaskListItem[] = [
    {
      id: 't1',
      projectId: 'p1',
      projectName: 'Task App',
      title: 'Design icons',
      status: 'TO_DO',
      priority: 'LOW',
      startDate: null,
      dueDate: '2026-08-20',
      estimatedHours: null,
      totalLoggedHours: 0,
      overdue: false,
      assignees: [],
      tags: [{ id: 'tag1', name: 'Frontend', color: '#5560c1' }],
      blocked: true,
      blockedReason: 'Waiting on design sign-off',
      checklistDone: 1,
      checklistTotal: 3,
      pinned: false,
    },
    {
      id: 't2',
      projectId: 'p1',
      projectName: 'Task App',
      title: 'Review auth flow',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      startDate: null,
      dueDate: null,
      estimatedHours: null,
      totalLoggedHours: 1,
      overdue: false,
      assignees: [],
      tags: [],
      blocked: false,
      blockedReason: null,
      checklistDone: 0,
      checklistTotal: 0,
      pinned: true,
    },
  ]

  it('groups tasks into status columns with counts', async () => {
    signIn()
    renderRoutes([{ path: '/k', element: <KanbanView tasks={tasks} /> }], '/k')
    expect(await screen.findByText('Design icons')).toBeInTheDocument()
    expect(screen.getByText('Review auth flow')).toBeInTheDocument()
    // Column headers exist for every status
    expect(screen.getByText('To do')).toBeInTheDocument()
    expect(screen.getByText('In review')).toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })
})
