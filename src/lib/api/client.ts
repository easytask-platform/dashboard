import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ApiError, type ApiErrorBody, type RefreshResponse } from './types'
import { tokenStore } from './token-store'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

/**
 * Axios instance implementing the contract's auth model:
 * - attaches the JWT access token to every request
 * - on 401, transparently calls POST /auth/refresh (rotation-aware) and
 *   retries the original request once
 * - single-flight: concurrent 401s share one refresh call, so a rotated
 *   refresh token is never presented twice (the backend treats reuse as theft
 *   and revokes all sessions)
 * - every failure is normalized to ApiError with the contract shape
 */
export const api = axios.create({ baseURL: API_BASE_URL })

/** Called when the session cannot be recovered (refresh failed). */
let onSessionExpired: (() => void) | null = null
export function setOnSessionExpired(handler: (() => void) | null) {
  onSessionExpired = handler
}

api.interceptors.request.use((config) => {
  const token = tokenStore.accessToken
  if (token && !config.headers.has('Authorization')) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

let refreshInFlight: Promise<string> | null = null

async function refreshTokens(): Promise<string> {
  const refreshToken = tokenStore.refreshToken
  if (!refreshToken) throw new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'No session' }, 401)
  // Bare axios: must not recurse into this interceptor chain.
  const { data } = await axios.post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
  tokenStore.set(data.accessToken, data.refreshToken)
  return data.accessToken
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status ?? 0

    const isAuthEndpoint = config?.url?.startsWith('/auth/') ?? false
    if (status === 401 && config && !config._retried && !isAuthEndpoint && tokenStore.refreshToken) {
      config._retried = true
      try {
        refreshInFlight ??= refreshTokens().finally(() => {
          refreshInFlight = null
        })
        const newAccessToken = await refreshInFlight
        config.headers.set('Authorization', `Bearer ${newAccessToken}`)
        return await api.request(config)
      } catch {
        tokenStore.clear()
        onSessionExpired?.()
      }
    }

    throw new ApiError(error.response?.data, status)
  },
)
