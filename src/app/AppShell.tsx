import { NavLink, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  Bell,
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
import { applyLanguage, storedLanguage } from '@/i18n'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/users', key: 'nav.users', icon: UsersRound, permission: 'user:read' },
  { to: '/roles', key: 'nav.roles', icon: ShieldCheck, permission: 'role:read' },
  { to: '/teams', key: 'nav.teams', icon: Contact, permission: 'team:read' },
  { to: '/projects', key: 'nav.projects', icon: FolderKanban, permission: 'project:read' },
  { to: '/tasks', key: 'nav.tasks', icon: CalendarCheck2, permission: 'task:read' },
  { to: '/reports', key: 'nav.reports', icon: ChartNoAxesColumn, permission: 'dashboard:manager' },
  { to: '/notifications', key: 'nav.notifications', icon: Bell },
] as const

export function AppShell() {
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()

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
        <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
          <span className="text-sm font-medium text-ink-soft">{user?.organizationName}</span>
          <button
            type="button"
            onClick={() => applyLanguage(storedLanguage() === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:bg-paper"
          >
            <Languages className="size-4" aria-hidden />
            {t('common.language')}
          </button>
        </header>
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
