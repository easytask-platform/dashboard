import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { TaskTabs } from './TaskTabs'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'

let postedComment: unknown = null
let postedTime: unknown = null
let uploadedContent: string | null = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/tasks/task1/comments`, () =>
    HttpResponse.json({
      items: [
        {
          id: 'c1',
          taskId: 'task1',
          author: { id: 'u2', fullName: 'Sam Employee' },
          text: 'I started this task.',
          createdAt: '2026-06-29T10:00:00Z',
          updatedAt: '2026-06-29T10:00:00Z',
        },
        {
          id: 'c2',
          taskId: 'task1',
          author: { id: 'u1', fullName: 'Ava Admin' },
          text: 'My own comment',
          createdAt: '2026-06-29T11:00:00Z',
          updatedAt: '2026-06-29T11:00:00Z',
        },
      ],
    }),
  ),
  http.post(`${API_BASE_URL}/tasks/task1/comments`, async ({ request }) => {
    postedComment = await request.json()
    return HttpResponse.json({}, { status: 201 })
  }),
  http.get(`${API_BASE_URL}/tasks/task1/attachments`, () =>
    HttpResponse.json({
      items: [
        {
          id: 'a1',
          taskId: 'task1',
          originalFilename: 'notes.pdf',
          contentType: 'application/pdf',
          fileSize: 204800,
          uploader: { id: 'u2', fullName: 'Sam Employee' },
          uploadedAt: '2026-06-29T10:00:00Z',
        },
      ],
    }),
  ),
  http.post(`${API_BASE_URL}/tasks/task1/attachments`, ({ request }) => {
    // jsdom cannot faithfully stream multipart bodies; asserting the call +
    // content type is the reliable signal here (real browsers do the rest).
    uploadedContent = request.headers.get('content-type')
    return HttpResponse.json({}, { status: 201 })
  }),
  http.get(`${API_BASE_URL}/tasks/task1/time-entries`, () =>
    HttpResponse.json({
      items: [
        {
          id: 'te1',
          taskId: 'task1',
          employee: { id: 'u2', fullName: 'Sam Employee' },
          workDate: '2026-06-29',
          hoursSpent: 2,
          note: 'Built login form',
          createdAt: '2026-06-29T10:00:00Z',
        },
      ],
      totalLoggedHours: 2,
      estimatedHours: 6,
    }),
  ),
  http.post(`${API_BASE_URL}/tasks/task1/time-entries`, async ({ request }) => {
    postedTime = await request.json()
    return HttpResponse.json({}, { status: 201 })
  }),
  http.get(`${API_BASE_URL}/tasks/task1/activity`, () =>
    HttpResponse.json({
      items: [
        {
          id: 'ev1',
          taskId: 'task1',
          actor: { id: 'u3', fullName: 'Ava Manager' },
          eventType: 'STATUS_CHANGED',
          oldValue: 'IN_REVIEW',
          newValue: 'APPROVED',
          createdAt: '2026-06-29T10:00:00Z',
        },
      ],
    }),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  postedComment = null
  postedTime = null
  uploadedContent = null
})

function renderTabs() {
  signIn()
  renderRoutes([{ path: '/t', element: <TaskTabs taskId="task1" /> }], '/t')
}

describe('task collaboration tabs', () => {
  it('shows comments; delete only on own comment; posts new ones', async () => {
    const user = userEvent.setup()
    renderTabs()
    expect(await screen.findByText('I started this task.')).toBeInTheDocument()
    // Only the own comment (Ava Admin = u1) has a delete button
    expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(1)

    await user.type(screen.getByLabelText(/write a comment/i), 'Looks good')
    await user.click(screen.getByRole('button', { name: /post/i }))
    expect(postedComment).toEqual({ text: 'Looks good' })
  })

  it('lists and uploads attachments', async () => {
    const user = userEvent.setup()
    renderTabs()
    await user.click(screen.getByRole('tab', { name: /attachments/i }))
    expect(await screen.findByText('notes.pdf')).toBeInTheDocument()
    expect(screen.getByText(/200 KB/)).toBeInTheDocument()

    const file = new File(['hello'], 'report.docx', { type: 'application/msword' })
    await user.upload(screen.getByLabelText(/upload file/i), file)
    expect(await screen.findByText(/file uploaded/i)).toBeInTheDocument()
    expect(uploadedContent).toMatch(/multipart\/form-data/)
  })

  it('logs time with date and hours', async () => {
    const user = userEvent.setup()
    renderTabs()
    await user.click(screen.getByRole('tab', { name: /^time$/i }))
    expect(await screen.findByText(/sam employee — 2h/i)).toBeInTheDocument()
    expect(screen.getByText('2 / 6')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/work date/i), '2026-08-16')
    await user.type(screen.getByLabelText(/^hours$/i), '3')
    await user.type(screen.getByLabelText(/^note$/i), 'API layer')
    await user.click(screen.getByRole('button', { name: /log time/i }))
    expect(await screen.findByText(/time logged/i)).toBeInTheDocument()
    expect(postedTime).toEqual({ workDate: '2026-08-16', hoursSpent: 3, note: 'API layer' })
  })

  it('renders the activity trail with translated status change', async () => {
    const user = userEvent.setup()
    renderTabs()
    await user.click(screen.getByRole('tab', { name: /activity/i }))
    expect(await screen.findByText('Ava Manager')).toBeInTheDocument()
    expect(screen.getByText(/changed the status/i)).toBeInTheDocument()
    expect(screen.getByText(/from In review to Approved/i)).toBeInTheDocument()
  })
})
