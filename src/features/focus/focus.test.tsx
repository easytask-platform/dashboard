import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'
import { ChecklistSection } from '@/features/tasks/ChecklistSection'
import type { ChecklistItem } from '@/features/tasks/api'

let checklist: ChecklistItem[] = [
  { id: 'i1', taskId: 'task1', title: 'Design the form', done: true, position: 1 },
  { id: 'i2', taskId: 'task1', title: 'Wire the API', done: false, position: 2 },
]

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/tasks/task1/checklist`, () => HttpResponse.json({ items: checklist })),
  http.patch(`${API_BASE_URL}/checklist-items/i2`, async ({ request }) => {
    const body = (await request.json()) as { done?: boolean }
    checklist = checklist.map((item) => (item.id === 'i2' ? { ...item, done: body.done ?? item.done } : item))
    return HttpResponse.json(checklist[1])
  }),
  http.post(`${API_BASE_URL}/tasks/task1/checklist`, async ({ request }) => {
    const body = (await request.json()) as { title: string }
    const item: ChecklistItem = { id: `i${checklist.length + 1}`, taskId: 'task1', title: body.title, done: false, position: checklist.length + 1 }
    checklist = [...checklist, item]
    return HttpResponse.json(item, { status: 201 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  checklist = [
    { id: 'i1', taskId: 'task1', title: 'Design the form', done: true, position: 1 },
    { id: 'i2', taskId: 'task1', title: 'Wire the API', done: false, position: 2 },
  ]
})

describe('checklist (P4-5)', () => {
  it('shows items with progress and toggles done', async () => {
    signIn()
    renderRoutes(
      [{ path: '/c', element: <ChecklistSection taskId="task1" canManage canToggle /> }],
      '/c',
    )
    await waitFor(() => expect(screen.getByText('Design the form')).toBeInTheDocument())
    expect(screen.getByText('1/2')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Wire the API' }))
    await waitFor(() => expect(screen.getByText('2/2')).toBeInTheDocument())
  })

  it('adds an item when managing', async () => {
    signIn()
    renderRoutes(
      [{ path: '/c', element: <ChecklistSection taskId="task1" canManage canToggle /> }],
      '/c',
    )
    await waitFor(() => expect(screen.getByText('Design the form')).toBeInTheDocument())

    await userEvent.type(screen.getByLabelText(/Add a checklist item/), 'Write tests')
    await userEvent.click(screen.getByRole('button', { name: /Add/ }))
    await waitFor(() => expect(screen.getByText('Write tests')).toBeInTheDocument())
  })

  it('disables toggling without permission', async () => {
    signIn()
    renderRoutes(
      [{ path: '/c', element: <ChecklistSection taskId="task1" canManage={false} canToggle={false} /> }],
      '/c',
    )
    await waitFor(() => expect(screen.getByText('Design the form')).toBeInTheDocument())
    expect(screen.getByRole('checkbox', { name: 'Wire the API' })).toBeDisabled()
  })
})
