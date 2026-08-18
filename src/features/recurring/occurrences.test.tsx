import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'
import { OccurrencesDialog } from './OccurrencesDialog'
import type { RecurringRule } from './api'

const rule: RecurringRule = {
  id: 'r1',
  projectId: 'p1',
  title: 'Weekly report',
  frequency: 'WEEKLY',
  interval: 1,
  recurrenceStartDate: '2026-08-17',
  recurrenceEndDate: null,
  assigneeIds: [],
}

let occurrences = [
  { date: '2026-08-24', skipped: false },
  { date: '2026-08-31', skipped: false },
]
let skipped: string | null = null
let restored: string | null = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/recurring-task-rules/r1/occurrences`, () =>
    HttpResponse.json({ items: occurrences }),
  ),
  http.post(`${API_BASE_URL}/recurring-task-rules/r1/exceptions`, async ({ request }) => {
    const body = (await request.json()) as { date: string }
    skipped = body.date
    occurrences = occurrences.map((o) => (o.date === body.date ? { ...o, skipped: true } : o))
    return new HttpResponse(null, { status: 204 })
  }),
  http.delete(`${API_BASE_URL}/recurring-task-rules/r1/exceptions/:date`, ({ params }) => {
    restored = params.date as string
    occurrences = occurrences.map((o) => (o.date === restored ? { ...o, skipped: false } : o))
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  occurrences = [
    { date: '2026-08-24', skipped: false },
    { date: '2026-08-31', skipped: false },
  ]
  skipped = null
  restored = null
})

describe('recurrence exceptions (P4-10)', () => {
  it('lists upcoming occurrences and skips one', async () => {
    signIn()
    renderRoutes([{ path: '/r', element: <OccurrencesDialog rule={rule} onClose={() => {}} /> }], '/r')

    await waitFor(() => expect(screen.getByText('2026-08-24')).toBeInTheDocument())
    const skipButtons = screen.getAllByRole('button', { name: 'Skip' })
    await userEvent.click(skipButtons[0])

    await waitFor(() => expect(skipped).toBe('2026-08-24'))
    // after skipping, that row offers Restore
    await waitFor(() => expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument())
  })

  it('restores a skipped occurrence', async () => {
    occurrences = [{ date: '2026-08-24', skipped: true }]
    signIn()
    renderRoutes([{ path: '/r', element: <OccurrencesDialog rule={rule} onClose={() => {}} /> }], '/r')

    await waitFor(() => expect(screen.getByText('2026-08-24')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(restored).toBe('2026-08-24'))
  })
})
