import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'
import { QuickFilterBar } from './QuickFilterBar'
import type { SavedFilter } from './api'

let saved: SavedFilter[] = [
  { id: 'sf1', name: 'High priority', filters: { priority: 'HIGH' }, createdAt: '2026-08-18T10:00:00Z' },
]
let created: { name: string; filters: Record<string, string> } | null = null
let deleted: string | null = null

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/me/saved-filters`, () => HttpResponse.json({ items: saved })),
  http.post(`${API_BASE_URL}/me/saved-filters`, async ({ request }) => {
    created = (await request.json()) as { name: string; filters: Record<string, string> }
    const filter: SavedFilter = { id: 'sf2', name: created.name, filters: created.filters, createdAt: '2026-08-18T11:00:00Z' }
    saved = [...saved, filter]
    return HttpResponse.json(filter, { status: 201 })
  }),
  http.delete(`${API_BASE_URL}/me/saved-filters/:id`, ({ params }) => {
    deleted = params.id as string
    saved = saved.filter((f) => f.id !== deleted)
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  saved = [{ id: 'sf1', name: 'High priority', filters: { priority: 'HIGH' }, createdAt: '2026-08-18T10:00:00Z' }]
  created = null
  deleted = null
})

describe('saved filters bar (P4-8)', () => {
  it('applies a saved filter on chip click', async () => {
    const onApply = vi.fn()
    signIn()
    renderRoutes(
      [{ path: '/f', element: <QuickFilterBar currentFilters={{}} hasActiveFilters={false} onApply={onApply} /> }],
      '/f',
    )
    await waitFor(() => expect(screen.getByText('High priority')).toBeInTheDocument())
    await userEvent.click(screen.getByText('High priority'))
    expect(onApply).toHaveBeenCalledWith({ priority: 'HIGH' })
  })

  it('saves the current filter combination under a name', async () => {
    signIn()
    renderRoutes(
      [
        {
          path: '/f',
          element: (
            <QuickFilterBar
              currentFilters={{ status: 'IN_REVIEW', priority: 'HIGH' }}
              hasActiveFilters
              onApply={() => {}}
            />
          ),
        },
      ],
      '/f',
    )
    await waitFor(() => expect(screen.getByText('High priority')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Save filters' }))
    await userEvent.type(screen.getByLabelText(/Name/), 'In review + high')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(created).toEqual({ name: 'In review + high', filters: { status: 'IN_REVIEW', priority: 'HIGH' } }))
  })

  it('deletes a saved filter', async () => {
    signIn()
    renderRoutes(
      [{ path: '/f', element: <QuickFilterBar currentFilters={{}} hasActiveFilters={false} onApply={() => {}} /> }],
      '/f',
    )
    await waitFor(() => expect(screen.getByText('High priority')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Delete saved filter High priority' }))
    await waitFor(() => expect(deleted).toBe('sf1'))
  })
})
