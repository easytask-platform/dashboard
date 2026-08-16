import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { TeamsPage } from '@/features/teams/TeamsPage'
import { ProjectsPage } from './ProjectsPage'
import { ProjectDetailsPage } from './ProjectDetailsPage'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'

const team = { id: 't1', name: 'Mobile Team', description: 'Flutter squad', memberCount: 2 }
const project = {
  id: 'p1',
  name: 'Task App',
  description: 'College project',
  status: 'ACTIVE',
  startDate: '2026-06-29',
  dueDate: '2026-07-30',
  progressPercent: 45,
  memberCount: 2,
}

let addedTeamMember: unknown = null
let removedProjectMember: string | null = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/teams`, () =>
    HttpResponse.json({ items: [team], page: 0, size: 20, totalItems: 1, totalPages: 1 }),
  ),
  http.get(`${API_BASE_URL}/teams/t1/members`, () =>
    HttpResponse.json({ items: [{ id: 'u2', fullName: 'Sam Employee', email: 'sam@acme.test', role: 'EMPLOYEE' }] }),
  ),
  http.post(`${API_BASE_URL}/teams/t1/members`, async ({ request }) => {
    addedTeamMember = await request.json()
    return HttpResponse.json({}, { status: 201 })
  }),
  http.get(`${API_BASE_URL}/users`, () =>
    HttpResponse.json({
      items: [
        { id: 'u2', fullName: 'Sam Employee', email: 'sam@acme.test', role: 'EMPLOYEE', roleId: 'r', active: true, createdAt: '2026-06-29T10:00:00Z' },
        { id: 'u3', fullName: 'Lee Manager', email: 'lee@acme.test', role: 'MANAGER', roleId: 'r', active: true, createdAt: '2026-06-29T10:00:00Z' },
      ],
      page: 0,
      size: 20,
      totalItems: 2,
      totalPages: 1,
    }),
  ),
  http.get(`${API_BASE_URL}/projects`, () =>
    HttpResponse.json({ items: [project], page: 0, size: 20, totalItems: 1, totalPages: 1 }),
  ),
  http.get(`${API_BASE_URL}/projects/p1`, () =>
    HttpResponse.json({
      ...project,
      taskSummary: { toDo: 3, inProgress: 4, inReview: 1, approved: 6, reopened: 0, cancelled: 1 },
    }),
  ),
  http.get(`${API_BASE_URL}/projects/p1/members`, () =>
    HttpResponse.json({ items: [{ id: 'u2', fullName: 'Sam Employee', email: 'sam@acme.test', role: 'EMPLOYEE' }] }),
  ),
  http.delete(`${API_BASE_URL}/projects/p1/members/u2`, () => {
    removedProjectMember = 'u2'
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  addedTeamMember = null
  removedProjectMember = null
})

describe('teams page', () => {
  it('lists teams and manages members', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/teams', element: <TeamsPage /> }], '/teams')
    expect(await screen.findByText('Mobile Team')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /members/i }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Sam Employee')).toBeInTheDocument()

    // Candidate list excludes existing members
    const picker = within(dialog).getByLabelText(/pick a user/i)
    expect(within(picker).queryByText(/sam employee/i)).not.toBeInTheDocument()
    await user.selectOptions(picker, 'u3')
    await user.click(within(dialog).getByRole('button', { name: /add/i }))
    expect(await screen.findByText('Mobile Team')).toBeInTheDocument()
    expect(addedTeamMember).toEqual({ userId: 'u3' })
  })
})

describe('projects', () => {
  it('lists projects with status and progress', async () => {
    signIn()
    renderRoutes([{ path: '/projects', element: <ProjectsPage /> }], '/projects')
    expect(await screen.findByText('Task App')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('Active')).toBeInTheDocument()
  })

  it('shows details with task flow summary and member removal', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/projects/:projectId', element: <ProjectDetailsPage /> }], '/projects/p1')
    expect(await screen.findByText('Task App')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    // Flow rail legend shows per-status counts
    expect(screen.getByText('In progress')).toHaveTextContent(/4/)
    expect(await screen.findByText('Sam Employee')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /remove sam employee/i }))
    await screen.findByText('Task App')
    expect(removedProjectMember).toBe('u2')
  })
})
