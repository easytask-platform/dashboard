import { describe, it, expect, beforeEach, afterEach, afterAll, beforeAll } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { api, API_BASE_URL, setOnSessionExpired } from './client'
import { tokenStore } from './token-store'
import { ApiError } from './types'

let refreshCalls = 0
let protectedCalls: string[] = []

const server = setupServer(
  http.get(`${API_BASE_URL}/protected`, ({ request }) => {
    const auth = request.headers.get('Authorization') ?? ''
    protectedCalls.push(auth)
    if (auth === 'Bearer good-token') return HttpResponse.json({ ok: true })
    return HttpResponse.json(
      { status: 401, code: 'UNAUTHORIZED', message: 'Expired' },
      { status: 401 },
    )
  }),
  http.post(`${API_BASE_URL}/auth/refresh`, async ({ request }) => {
    refreshCalls++
    const { refreshToken } = (await request.json()) as { refreshToken: string }
    if (refreshToken !== 'valid-refresh') {
      return HttpResponse.json(
        { status: 401, code: 'UNAUTHORIZED', message: 'Invalid refresh token' },
        { status: 401 },
      )
    }
    return HttpResponse.json({ accessToken: 'good-token', refreshToken: 'rotated-refresh' })
  }),
  http.post(`${API_BASE_URL}/users`, () =>
    HttpResponse.json(
      {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        fields: { email: 'must be a valid email' },
      },
      { status: 400 },
    ),
  ),
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())

beforeEach(() => {
  refreshCalls = 0
  protectedCalls = []
})

afterEach(() => {
  server.resetHandlers()
  tokenStore.clear()
  setOnSessionExpired(null)
})

describe('api client', () => {
  it('attaches the stored access token as a Bearer header', async () => {
    tokenStore.set('good-token', 'valid-refresh')
    const { data } = await api.get('/protected')
    expect(data).toEqual({ ok: true })
    expect(protectedCalls).toEqual(['Bearer good-token'])
  })

  it('refreshes once on 401, stores rotated tokens, and retries the request', async () => {
    tokenStore.set('expired-token', 'valid-refresh')
    const { data } = await api.get('/protected')
    expect(data).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
    expect(tokenStore.accessToken).toBe('good-token')
    expect(tokenStore.refreshToken).toBe('rotated-refresh')
    expect(protectedCalls).toEqual(['Bearer expired-token', 'Bearer good-token'])
  })

  it('single-flights concurrent 401s into one refresh call', async () => {
    tokenStore.set('expired-token', 'valid-refresh')
    const [a, b, c] = await Promise.all([
      api.get('/protected'),
      api.get('/protected'),
      api.get('/protected'),
    ])
    expect(a.data).toEqual({ ok: true })
    expect(b.data).toEqual({ ok: true })
    expect(c.data).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
  })

  it('clears the session and notifies when refresh fails', async () => {
    tokenStore.set('expired-token', 'stolen-refresh')
    let expired = false
    setOnSessionExpired(() => {
      expired = true
    })
    await expect(api.get('/protected')).rejects.toBeInstanceOf(ApiError)
    expect(expired).toBe(true)
    expect(tokenStore.accessToken).toBeNull()
    expect(tokenStore.refreshToken).toBeNull()
  })

  it('normalizes contract errors including field-level messages', async () => {
    tokenStore.set('good-token', 'valid-refresh')
    try {
      await api.post('/users', {})
      expect.unreachable('should have thrown')
    } catch (error) {
      const apiError = error as ApiError
      expect(apiError).toBeInstanceOf(ApiError)
      expect(apiError.status).toBe(400)
      expect(apiError.code).toBe('VALIDATION_ERROR')
      expect(apiError.fields).toEqual({ email: 'must be a valid email' })
    }
  })
})
