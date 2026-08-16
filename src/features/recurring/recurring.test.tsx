import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { RecurringPage } from './RecurringPage'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'

const rule = {
  id: 'rule1',
  projectId: 'p1',
  title: 'Weekly report',
  frequency: 'WEEKLY',
  interval: 1,
  recurrenceStartDate: '2026-06-29',
  recurrenceEndDate: null,
  assigneeIds: ['u2'],
}

let createdBody: unknown = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/recurring-task-rules`, () =>
    HttpResponse.json({ items: [rule], page: 0, size: 20, totalItems: 1, totalPages: 1 }),
  ),
  http.post(`${API_BASE_URL}/recurring-task-rules`, async ({ request }) => {
    createdBody = await request.json()
    return HttpResponse.json({}, { status: 201 })
  }),
  http.get(`${API_BASE_URL}/recurring-task-rules/rule1/tasks`, () =>
    HttpResponse.json({
      items: [
        {
          id: 'task9',
          projectId: 'p1',
          projectName: 'Task App',
          title: 'Weekly report',
          status: 'TO_DO',
          priority: 'MEDIUM',
          startDate: null,
          dueDate: '2026-08-20',
          estimatedHours: 2,
          totalLoggedHours: 0,
          overdue: false,
          assignees: [],
        },
      ],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    }),
  ),
  http.get(`${API_BASE_URL}/projects`, () =>
    HttpResponse.json({
      items: [
        {
          id: 'p1',
          name: 'Task App',
          description: '',
          status: 'ACTIVE',
          startDate: null,
          dueDate: null,
          progressPercent: 0,
          memberCount: 1,
        },
      ],
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    }),
  ),
  http.get(`${API_BASE_URL}/projects/p1/members`, () =>
    HttpResponse.json({ items: [{ id: 'u2', fullName: 'Sam Employee', email: 'sam@acme.test', role: 'EMPLOYEE' }] }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  createdBody = null
})

describe('recurring tasks', () => {
  it('lists rules with frequency and shows generated tasks', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/tasks/recurring', element: <RecurringPage /> }], '/tasks/recurring')
    expect(await screen.findByText('Weekly report')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Weekly')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /view generated/i }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('2026-08-20')).toBeInTheDocument()
    expect(within(dialog).getByText('To do')).toBeInTheDocument()
  })

  it('creates a rule with recurrence and assignees', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/tasks/recurring', element: <RecurringPage /> }], '/tasks/recurring')
    await screen.findByText('Weekly report')

    await user.click(screen.getByRole('button', { name: /create recurring task/i }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText(/projects/i), 'p1')
    await user.type(within(dialog).getByLabelText(/^title/i), 'Standup notes')
    await user.selectOptions(within(dialog).getByLabelText(/frequency/i), 'DAILY')
    await user.type(within(dialog).getByLabelText(/recurrence start/i), '2026-09-01')
    await user.click(await within(dialog).findByRole('checkbox', { name: /sam employee/i }))
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText(/save changes/i)).toBeInTheDocument()
    expect(createdBody).toMatchObject({
      projectId: 'p1',
      title: 'Standup notes',
      frequency: 'DAILY',
      interval: 1,
      recurrenceStartDate: '2026-09-01',
      recurrenceEndDate: null,
      assigneeIds: ['u2'],
    })
  })
})
