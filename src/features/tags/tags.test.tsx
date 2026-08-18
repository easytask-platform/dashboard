import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { renderRoutes, meHandler, signIn, API_BASE_URL } from '@/test/utils'
import { TagsManager } from './TagsManager'
import type { Tag } from './api'

let tags: Tag[] = [{ id: 'tag1', projectId: 'p1', name: 'Frontend', color: '#5560c1' }]

const server = setupServer(
  meHandler(),
  http.get(`${API_BASE_URL}/projects/p1/tags`, () => HttpResponse.json({ items: tags })),
  http.post(`${API_BASE_URL}/projects/p1/tags`, async ({ request }) => {
    const body = (await request.json()) as { name: string; color: string }
    if (tags.some((tag) => tag.name === body.name)) {
      return HttpResponse.json(
        { status: 409, code: 'CONFLICT', message: 'Tag name already exists in this project' },
        { status: 409 },
      )
    }
    const tag: Tag = { id: `tag${tags.length + 1}`, projectId: 'p1', ...body }
    tags = [...tags, tag]
    return HttpResponse.json(tag, { status: 201 })
  }),
  http.delete(`${API_BASE_URL}/tags/tag1`, () => {
    tags = tags.filter((tag) => tag.id !== 'tag1')
    return new HttpResponse(null, { status: 204 })
  }),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
afterEach(() => {
  server.resetHandlers()
  tags = [{ id: 'tag1', projectId: 'p1', name: 'Frontend', color: '#5560c1' }]
})

describe('tags (P4-3)', () => {
  it('lists tags and creates a new one', async () => {
    signIn()
    renderRoutes([{ path: '/p', element: <TagsManager projectId="p1" /> }], '/p')
    await waitFor(() => expect(screen.getByText('Frontend')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add tag/ }))
    await userEvent.type(screen.getByLabelText(/Name/), 'Backend')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.getByText('Backend')).toBeInTheDocument())
  })

  it('surfaces the duplicate-name conflict from the API', async () => {
    signIn()
    renderRoutes([{ path: '/p', element: <TagsManager projectId="p1" /> }], '/p')
    await waitFor(() => expect(screen.getByText('Frontend')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Add tag/ }))
    await userEvent.type(screen.getByLabelText(/Name/), 'Frontend')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() =>
      expect(screen.getByText('Tag name already exists in this project')).toBeInTheDocument(),
    )
  })

  it('deletes a tag after confirmation', async () => {
    signIn()
    renderRoutes([{ path: '/p', element: <TagsManager projectId="p1" /> }], '/p')
    await waitFor(() => expect(screen.getByText('Frontend')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete tag Frontend' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(screen.queryByText('Frontend')).not.toBeInTheDocument())
    expect(screen.getByText('No tags yet')).toBeInTheDocument()
  })
})
