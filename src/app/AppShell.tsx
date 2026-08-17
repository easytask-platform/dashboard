import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  ClipboardCheck,
  CalendarCheck2,
  ChartNoAxesColumn,
  CircleUserRound,
  FolderKanban,
  LayoutDashboard,
  Languages,
  ShieldCheck,
  UsersRound,
  Contact,
} from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { useUnreadCountQuery } from '@/features/notifications/api'
import { enableWebPush, pushAvailable, pushGranted } from '@/lib/push/push'
import { useToast } from '@/components/ui/Toast'
import { applyLanguage, storedLanguage } from '@/i18n'
import { cn } from '@/lib/utils'

function UnreadBadge() {
  const unreadQuery = useUnreadCountQuery()
  if (!unreadQuery.data) return null
  return (
    <span className="ms-auto rounded-full bg-danger px-2 py-0.5 text-xs font-semibold text-white">
      {unreadQuery.data > 99 ? '99+' : unreadQuery.data}
    </span>
  )
}

const NAV_ITEMS = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', key: 'nav.users', icon: UsersRound, permission: 'user:read' },
  { to: '/roles', key: 'nav.roles', icon: ShieldCheck, permission: 'role:manage' },
  { to: '/teams', key: 'nav.teams', icon: Contact, permission: 'team:read' },
  // Project/task read access is implicit (dataScope-filtered) — no gate.
  { to: '/projects', key: 'nav.projects', icon: FolderKanban },
  { to: '/tasks', key: 'nav.tasks', icon: CalendarCheck2 },
  { to: '/review', key: 'nav.review', icon: ClipboardCheck, permission: 'task:review' },
  { to: '/reports', key: 'nav.reports', icon: ChartNoAxesColumn, permission: 'dashboard:manager' },
  { to: '/notifications', key: 'nav.notifications', icon: Bell },
] as const

export function AppShell() {
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  // Browsers only show the permission prompt on a user gesture, so we offer
  // a button while permission is undecided and auto-register once granted.
  const [pushEnabled, setPushEnabled] = useState(pushGranted())
  const [enablingPush, setEnablingPush] = useState(false)

  const registerPush = async () => {
    setEnablingPush(true)
    await enableWebPush((push) => {
      toast.success(push.body ? `${push.title} — ${push.body}` : push.title)
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    })
    setEnablingPush(false)
    setPushEnabled(pushGranted())
  }

  // Web push (P3-6): always attempt on mount — re-registers silently when
  // already granted, and prompts right away where the browser allows
  // auto-prompts. The header button remains as fallback for browsers that
  // suppress non-gesture prompts.
  useEffect(() => {
    if (pushAvailable()) void registerPush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid size-9 place-items-center rounded-xl bg-primary font-bold">E</span>
          <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
        </div>
        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3" aria-label="Main">
          {NAV_ITEMS.filter((item) => !('permission' in item) || hasPermission(item.permission)).map(
            ({ to, key, icon: Icon, ...rest }) => (
              <NavLink
                key={to}
                to={to}
                end={'end' in rest && rest.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75 transition-colors',
                    'hover:bg-sidebar-hover hover:text-white',
                    isActive && 'bg-primary text-white hover:bg-primary',
                  )
                }
              >
                <Icon className="size-4.5" aria-hidden />
                {t(key)}
                {to === '/notifications' && <UnreadBadge />}
              </NavLink>
            ),
          )}
        </nav>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              'm-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/75',
              'hover:bg-sidebar-hover hover:text-white',
              isActive && 'bg-primary text-white hover:bg-primary',
            )
          }
        >
          <CircleUserRound className="size-4.5" aria-hidden />
          <span className="truncate">{user?.fullName}</span>
        </NavLink>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-6">
          <span className="text-sm font-medium text-ink-soft">{user?.organizationName}</span>
          <div className="flex items-center gap-2">
            {pushAvailable() && !pushEnabled && (
              <button
                type="button"
                onClick={() => void registerPush()}
                disabled={enablingPush}
                className="flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary-deep transition-colors hover:bg-primary/20 disabled:opacity-60"
              >
                <Bell className="size-4" aria-hidden />
                {enablingPush ? t('common.loading') : t('push.enable')}
              </button>
            )}
            <button
              type="button"
              onClick={() => applyLanguage(storedLanguage() === 'ar' ? 'en' : 'ar')}
              className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper"
            >
              <Languages className="size-4" aria-hidden />
              {t('common.language')}
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
