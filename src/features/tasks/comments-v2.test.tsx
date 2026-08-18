import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'
import { TaskTabs } from './TaskTabs'

const comments = [
  {
    id: 'c1',
    taskId: 'task1',
    author: { id: 'u2', fullName: 'Sam Employee', avatarUrl: null },
    text: 'I started this task.',
    parentCommentId: null,
    createdAt: '2026-08-18T10:00:00Z',
    updatedAt: '2026-08-18T10:00:00Z',
  },
  {
    id: 'c2',
    taskId: 'task1',
    author: { id: 'u3', fullName: 'Mona Manager', avatarUrl: null },
    text: 'Great, keep me posted.',
    parentCommentId: 'c1',
    createdAt: '2026-08-18T11:00:00Z',
    updatedAt: '2026-08-18T11:00:00Z',
  },
]

let postedBody: Record<string, unknown> | null = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/tasks/task1/comments`, () => HttpResponse.json({ items: comments })),
  http.post(`${API_BASE_URL}/tasks/task1/comments`, async ({ request }) => {
    postedBody = (await request.json()) as Record<string, unknown>
    return HttpResponse.json(
      {
        id: 'c3',
        taskId: 'task1',
        author: { id: 'u1', fullName: 'Ava Admin', avatarUrl: null },
        text: postedBody.text,
        parentCommentId: postedBody.parentCommentId ?? null,
        createdAt: '2026-08-18T12:00:00Z',
        updatedAt: '2026-08-18T12:00:00Z',
      },
      { status: 201 },
    )
  }),
  http.get(`${API_BASE_URL}/tasks/task1/activity`, () => HttpResponse.json({ items: [] })),
  http.get(`${API_BASE_URL}/projects/p1/members`, () =>
    HttpResponse.json({
      items: [
        { id: 'u2', fullName: 'Sam Employee', email: 'sam@acme.test', role: 'EMPLOYEE', avatarUrl: null },
        { id: 'u3', fullName: 'Mona Manager', email: 'mona@acme.test', role: 'MANAGER', avatarUrl: null },
      ],
    }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  postedBody = null
})

describe('comment replies + mentions (P4-4)', () => {
  it('groups replies under their parent comment', async () => {
    signIn()
    renderRoutes([{ path: '/t', element: <TaskTabs taskId="task1" projectId="p1" /> }], '/t')
    await waitFor(() => expect(screen.getByText('I started this task.')).toBeInTheDocument())
    expect(screen.getByText('Great, keep me posted.')).toBeInTheDocument()
    // reply button exists on the top-level comment only (one-level threading)
    expect(screen.getByRole('button', { name: 'Reply to Sam Employee' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reply to Mona Manager' })).not.toBeInTheDocument()
  })

  it('posts a reply with parentCommentId', async () => {
    signIn()
    renderRoutes([{ path: '/t', element: <TaskTabs taskId="task1" projectId="p1" /> }], '/t')
    await waitFor(() => expect(screen.getByText('I started this task.')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Reply to Sam Employee' }))
    expect(screen.getByText('Replying to Sam Employee')).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/Write a comment/), 'On it.')
    await userEvent.click(screen.getByRole('button', { name: /Post/ }))

    await waitFor(() => expect(postedBody).not.toBeNull())
    expect(postedBody).toMatchObject({ text: 'On it.', parentCommentId: 'c1' })
  })

  it('autocompletes @mentions and sends mentionedUserIds', async () => {
    signIn()
    renderRoutes([{ path: '/t', element: <TaskTabs taskId="task1" projectId="p1" /> }], '/t')
    await waitFor(() => expect(screen.getByText('I started this task.')).toBeInTheDocument())

    const input = screen.getByLabelText(/Write a comment/)
    await userEvent.type(input, 'Ping @Mo')
    await waitFor(() => expect(screen.getByRole('option', { name: /Mona Manager/ })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('option', { name: /Mona Manager/ }))
    expect(input).toHaveValue('Ping @Mona Manager ')

    await userEvent.click(screen.getByRole('button', { name: /Post/ }))
    await waitFor(() => expect(postedBody).not.toBeNull())
    expect(postedBody).toMatchObject({ text: 'Ping @Mona Manager', mentionedUserIds: ['u3'] })
  })
})
