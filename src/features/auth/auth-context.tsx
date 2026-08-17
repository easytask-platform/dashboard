/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setOnSessionExpired } from '@/lib/api/client'
import { tokenStore } from '@/lib/api/token-store'
import type { AuthUser, LoginResponse } from '@/lib/api/types'

interface AuthContextValue {
  user: AuthUser | null
  /** True while restoring a persisted session on first load. */
  bootstrapping: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [bootstrapping, setBootstrapping] = useState(() => tokenStore.refreshToken !== null)

  // Restore session: if tokens exist, /me tells us who we are (and the
  // client's refresh interceptor silently renews an expired access token).
  useEffect(() => {
    if (!tokenStore.refreshToken) return
    api
      .get<AuthUser>('/me')
      .then(({ data }) => setUser(data))
      .catch(() => tokenStore.clear())
      .finally(() => setBootstrapping(false))
  }, [])

  // When a refresh fails mid-session, drop straight to the login screen.
  useEffect(() => {
    setOnSessionExpired(() => setUser(null))
    return () => setOnSessionExpired(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
    tokenStore.set(data.accessToken, data.refreshToken)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    // Push unregistration needs the still-valid session, so it runs first.
    const { disableWebPush } = await import('@/lib/push/push')
    await disableWebPush()
    const refreshToken = tokenStore.refreshToken
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken })
    } catch {
      // Local logout must succeed even if the server call fails.
    } finally {
      tokenStore.clear()
      setUser(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    const { data } = await api.get<AuthUser>('/me')
    setUser(data)
  }, [])

  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  )

  const value = useMemo(
    () => ({ user, bootstrapping, login, logout, hasPermission, refreshUser }),
    [user, bootstrapping, login, logout, hasPermission, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

/** Renders children only when the current user holds the permission. */
export function Can({ permission, children }: { permission: string; children: ReactNode }) {
  const { hasPermission } = useAuth()
  return hasPermission(permission) ? <>{children}</> : null
}
