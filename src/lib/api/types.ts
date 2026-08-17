/** Contract error shape returned by GlobalExceptionHandler. */
export interface ApiErrorBody {
  status: number
  code: string
  message: string
  fields?: Record<string, string>
}

/** Contract pagination envelope (PageResponse). */
export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalItems: number
  totalPages: number
}

/** Normalized error thrown by the API client for every failed request. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>

  constructor(body: Partial<ApiErrorBody> | undefined, fallbackStatus: number) {
    super(body?.message ?? 'Request failed')
    this.name = 'ApiError'
    this.status = body?.status ?? fallbackStatus
    this.code = body?.code ?? 'UNKNOWN'
    this.fields = body?.fields ?? {}
  }
}

export interface AuthUser {
  id: string
  fullName: string
  email: string
  role: string
  roleId: string
  scope: string
  permissions: string[]
  organizationName: string
  /** True when an admin chose the current password — force a change before anything else. */
  mustChangePassword: boolean
}

export interface LoginResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}
