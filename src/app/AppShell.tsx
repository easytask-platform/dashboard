import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  ClipboardCheck,
  CalendarCheck2,
  CalendarRange,
  ChartNoAxesColumn,
  CircleUserRound,
  FolderKanban,
  LayoutDashboard,
  Languages,
  Moon,
  Sun,
  ScrollText,
  ShieldCheck,
  UsersRound,
  Contact,
} from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { Avatar } from '@/components/ui/Avatar'
import { useUnreadCountQuery } from '@/features/notifications/api'
import { enablePush, listenForegroundPush, pushGranted } from '@/lib/push/push'
import { useToast } from '@/components/ui/Toast'
import { applyLanguage, storedLanguage } from '@/i18n'
import { effectiveTheme, toggleTheme } from '@/lib/theme'
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

/** FR-12: light/dark toggle, persisted locally (P4-2/D31). */
function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState(effectiveTheme)
  return (
    <button
      type="button"
      onClick={() => setTheme(toggleTheme())}
      aria-label={t('common.toggleTheme')}
      title={t('common.toggleTheme')}
      className="flex items-center rounded-lg border border-line p-2 text-ink-soft transition-colors hover:bg-paper"
    >
      {theme === 'dark' ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
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
  { to: '/summary', key: 'nav.summary', icon: CalendarRange },
  { to: '/review', key: 'nav.review', icon: ClipboardCheck, permission: 'task:review' },
  { to: '/reports', key: 'nav.reports', icon: ChartNoAxesColumn, permission: 'dashboard:manager' },
  { to: '/audit', key: 'nav.audit', icon: ScrollText, permission: 'audit:read' },
  { to: '/notifications', key: 'nav.notifications', icon: Bell },
] as const

/**
 * Sidebar link styling (design port, Step 2): hover darkens the row and nudges
 * it inward; active shows a small white marker bar that grows in on the leading
 * edge. Logical props (ps/inset-inline via `start-0`) keep it correct in RTL.
 */
function sidebarLinkClass(isActive: boolean, extra?: string) {
  return cn(
    'group relative flex items-center gap-3 rounded-lg ps-3 pe-3 py-2.5 text-sm text-white/75',
    'transition-all duration-150 ease-lift hover:bg-sidebar-hover hover:text-white hover:ps-4',
    "before:absolute before:inset-y-2.5 before:start-0 before:w-[3px] before:rounded-e-sm before:bg-white before:content-['']",
    'before:origin-center before:scale-y-0 before:transition-transform before:duration-200 before:ease-lift',
    isActive && 'bg-primary text-white before:scale-y-100 hover:bg-primary',
    extra,
  )
}

export function AppShell() {
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  // Web push (P3-6): first-time opt-in happens at login/sign-up (a real user
  // gesture, so the prompt actually appears). Here we only re-register the
  // token for users who already granted it, and start the foreground listener
  // (toast + badge refresh); background messages go through the service worker.
  useEffect(() => {
    if (pushGranted()) void enablePush()
    void listenForegroundPush((push) => {
      toast.success(push.body ? `${push.title} — ${push.body}` : push.title)
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-sidebar text-white">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <img src="/logo.png" alt="" className="size-9 rounded-xl bg-white p-1" />
          <span className="text-lg font-semibold tracking-tight">{t('app.name')}</span>
        </div>
        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3" aria-label="Main">
          {NAV_ITEMS.filter((item) => !('permission' in item) || hasPermission(item.permission)).map(
            ({ to, key, icon: Icon, ...rest }) => (
              <NavLink
                key={to}
                to={to}
                end={'end' in rest && rest.end}
                className={({ isActive }) => sidebarLinkClass(isActive)}
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
          className={({ isActive }) => sidebarLinkClass(isActive, 'm-3')}
        >
          {user ? <Avatar person={user} size="xs" /> : <CircleUserRound className="size-4.5" aria-hidden />}
          <span className="truncate">{user?.fullName}</span>
        </NavLink>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-6">
          <span className="text-sm font-medium text-ink-soft">{user?.organizationName}</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
