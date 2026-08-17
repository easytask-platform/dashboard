import { Navigate, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/auth-context'
import { ForcedPasswordChangePage } from '@/features/auth/ForcedPasswordChangePage'

/** Blocks unauthenticated access; remembers where the user was heading. */
export function RequireAuth() {
  const { user, bootstrapping } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()

  if (bootstrapping) {
    return (
      <div className="grid min-h-screen place-items-center text-ink-soft">{t('common.loading')}</div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  // Admin-chosen password (P3-2): the whole app stays blocked until replaced.
  if (user.mustChangePassword) return <ForcedPasswordChangePage />
  return <Outlet />
}

/** Hides a whole route subtree behind a permission. */
export function RequirePermission({ permission }: { permission: string }) {
  const { hasPermission } = useAuth()
  const { t } = useTranslation()

  if (!hasPermission(permission)) {
    return (
      <div className="grid min-h-[50vh] place-items-center p-8 text-center text-ink-soft">
        {t('common.forbidden')}
      </div>
    )
  }
  return <Outlet />
}

/** Login/register pages bounce authenticated users back into the app. */
export function RedirectIfAuthed() {
  const { user, bootstrapping } = useAuth()
  if (bootstrapping) return null
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
