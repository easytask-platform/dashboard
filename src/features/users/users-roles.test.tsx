import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { UsersPage } from './UsersPage'
import { RolesPage } from '@/features/roles/RolesPage'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'

const roles = [
  { id: 'r-admin', name: 'ORGANIZATION_ADMIN', dataScope: 'ORGANIZATION', system: true, permissions: ['user:manage'], userCount: 1 },
  { id: 'r-emp', name: 'EMPLOYEE', dataScope: 'ASSIGNED', system: true, permissions: ['task:execute'], userCount: 4 },
  { id: 'r-custom', name: 'Reviewer', dataScope: 'MANAGED', system: false, permissions: ['task:review'], userCount: 0 },
]

const permissions = [
  { code: 'task:review', description: 'Approve or reopen tasks in review' },
  { code: 'task:execute', description: 'Work on assigned tasks' },
  { code: 'user:read', description: 'View users' },
]

let createdUserBody: unknown = null
let createdRoleBody: unknown = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/roles`, () => HttpResponse.json({ items: roles })),
  http.get(`${API_BASE_URL}/permissions`, () => HttpResponse.json({ items: permissions })),
  http.get(`${API_BASE_URL}/users`, ({ request }) => {
    const url = new URL(request.url)
    const items = [
      {
        id: 'u2',
        fullName: 'Sam Employee',
        email: 'sam@acme.test',
        role: 'EMPLOYEE',
        roleId: 'r-emp',
        active: true,
        createdAt: '2026-06-29T10:00:00Z',
      },
    ]
    return HttpResponse.json({
      items: url.searchParams.get('search') === 'nobody' ? [] : items,
      page: 0,
      size: 20,
      totalItems: 1,
      totalPages: 1,
    })
  }),
  http.post(`${API_BASE_URL}/users`, async ({ request }) => {
    createdUserBody = await request.json()
    return HttpResponse.json({}, { status: 201 })
  }),
  http.post(`${API_BASE_URL}/roles`, async ({ request }) => {
    createdRoleBody = await request.json()
    return HttpResponse.json({}, { status: 201 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  createdUserBody = null
  createdRoleBody = null
})

describe('users page', () => {
  it('lists users with role and state badges', async () => {
    signIn()
    renderRoutes([{ path: '/users', element: <UsersPage /> }], '/users')
    expect(await screen.findByText('Sam Employee')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getByText('EMPLOYEE')).toBeInTheDocument()
    expect(within(table).getByText('Active')).toBeInTheDocument()
  })

  it('invites a user by email (default mode, no password sent)', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/users', element: <UsersPage /> }], '/users')
    await screen.findByText('Sam Employee')

    await user.click(screen.getByRole('button', { name: /create user/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/full name/i), 'New Person')
    await user.type(within(dialog).getByLabelText(/^email$/i), 'new@acme.test')
    expect(within(dialog).queryByLabelText(/initial password/i)).not.toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText(/role/i), 'r-emp')
    await user.click(within(dialog).getByRole('button', { name: /create/i }))

    expect(await screen.findByText(/invitation sent/i)).toBeInTheDocument()
    expect(createdUserBody).toEqual({
      fullName: 'New Person',
      email: 'new@acme.test',
      roleId: 'r-emp',
    })
  })

  it('creates a user with a temporary password when that mode is picked', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/users', element: <UsersPage /> }], '/users')
    await screen.findByText('Sam Employee')

    await user.click(screen.getByRole('button', { name: /create user/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/full name/i), 'New Person')
    await user.type(within(dialog).getByLabelText(/^email$/i), 'new@acme.test')
    await user.click(within(dialog).getByRole('radio', { name: /temporary password/i }))
    await user.type(within(dialog).getByLabelText(/initial password/i), 'password123')
    await user.selectOptions(within(dialog).getByLabelText(/role/i), 'r-emp')
    await user.click(within(dialog).getByRole('button', { name: /create/i }))

    expect(await screen.findByText(/save changes/i)).toBeInTheDocument()
    expect(createdUserBody).toEqual({
      fullName: 'New Person',
      email: 'new@acme.test',
      initialPassword: 'password123',
      roleId: 'r-emp',
    })
  })
})

describe('roles page', () => {
  it('lists roles and hides edit/delete for system roles', async () => {
    signIn()
    renderRoutes([{ path: '/roles', element: <RolesPage /> }], '/roles')
    expect(await screen.findByText('Reviewer')).toBeInTheDocument()
    // Only the non-system role row exposes actions
    expect(screen.getAllByRole('button', { name: /edit/i })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(1)
  })

  it('creates a custom role from the permission checklist', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/roles', element: <RolesPage /> }], '/roles')
    await screen.findByText('Reviewer')

    await user.click(screen.getByRole('button', { name: /create role/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/name/i), 'QA Lead')
    await user.selectOptions(within(dialog).getByLabelText(/data scope/i), 'MANAGED')
    await user.click(within(dialog).getByRole('checkbox', { name: /task:review/i }))
    await user.click(within(dialog).getByRole('checkbox', { name: /user:read/i }))
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))

    expect(await screen.findByText(/save changes/i)).toBeInTheDocument()
    expect(createdRoleBody).toEqual({
      name: 'QA Lead',
      dataScope: 'MANAGED',
      permissions: expect.arrayContaining(['task:review', 'user:read']),
    })
  })

  it('requires at least one permission client-side', async () => {
    signIn()
    const user = userEvent.setup()
    renderRoutes([{ path: '/roles', element: <RolesPage /> }], '/roles')
    await screen.findByText('Reviewer')
    await user.click(screen.getByRole('button', { name: /create role/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/name/i), 'Empty Role')
    await user.click(within(dialog).getByRole('button', { name: /^create$/i }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/at least one permission/i)
    expect(createdRoleBody).toBeNull()
  })
})
