import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/auth-context'
import { format } from 'date-fns'
import {
  useAdminDashboardQuery,
  useManagerDashboardQuery,
  useActivityFeedQuery,
  type OverdueTaskItem,
  type WorkloadItem,
  type ProjectProgressItem,
} from './api'
import { Star, X } from 'lucide-react'
import { useFocusQuery, useUnpinTask } from '@/features/focus/api'
import { Avatar } from '@/components/ui/Avatar'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { FlowRail } from '@/components/ui/FlowRail'

/** Oversized stat — the dashboard's deliberate typographic moment. */
function StatCard({ label, value, to, accent }: { label: string; value: number; to?: string; accent?: boolean }) {
  const body = (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card transition-colors hover:border-primary/40">
      <p className={`text-4xl font-bold tracking-tight ${accent ? 'text-primary' : 'text-ink'}`}>{value}</p>
      <p className="mt-1 text-sm text-ink-soft">{label}</p>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()
  const isAdmin = hasPermission('dashboard:admin')
  const isManager = hasPermission('dashboard:manager')

  return (
    <div>
      <PageHeader title={t('home.welcome', { name: user?.fullName.split(' ')[0] })} />
      <FocusBoard />
      {isAdmin ? <AdminView /> : isManager ? <ManagerView /> : (
        <p className="text-sm text-ink-soft">{t('home.employeeHint')}</p>
      )}
    </div>
  )
}

/** Personal daily-focus board (P4-7/D33, FR-29): pinned tasks, lifecycle-neutral. */
function FocusBoard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const focusQuery = useFocusQuery()
  const unpinTask = useUnpinTask()

  if (!focusQuery.data || focusQuery.data.length === 0) return null
  return (
    <Section title={t('focus.title')}>
      <ul className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
        {focusQuery.data.map((task) => (
          <li key={task.id} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-paper">
            <Star className="size-4 shrink-0 fill-warning text-warning" aria-hidden />
            <button
              onClick={() => navigate(`/tasks/${task.id}`)}
              className="flex min-w-0 flex-1 items-center gap-2 text-start"
            >
              <span className="truncate font-medium">{task.title}</span>
              <span className="shrink-0 text-xs text-ink-soft">· {task.projectName}</span>
              <StatusBadge status={task.status} />
              {task.dueDate && (
                <span className={task.overdue ? 'text-xs font-semibold text-danger' : 'text-xs text-ink-soft'}>
                  {task.dueDate}
                </span>
              )}
            </button>
            <button
              aria-label={t('focus.unpin')}
              onClick={() => unpinTask.mutate(task.id)}
              className="shrink-0 text-ink-soft hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/** Org-wide recent-activity table (P3-4/D27) — scoped server-side per role. */
function RecentActivity() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const feedQuery = useActivityFeedQuery(10)

  return (
    <Section title={t('home.recentActivity')}>
      {feedQuery.isLoading ? (
        <p className="py-6 text-center text-sm text-ink-soft">{t('common.loading')}</p>
      ) : feedQuery.data?.items.length === 0 ? (
        <p className="rounded-card border border-line bg-surface py-6 text-center text-sm text-ink-soft shadow-card">
          {t('home.noActivity')}
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface shadow-card">
          {feedQuery.data?.items.map((event) => (
            <li key={event.id}>
              <button
                onClick={() => navigate(`/tasks/${event.taskId}`)}
                className="flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-start text-sm hover:bg-paper"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar person={event.actor} size="xs" />
                  <span className="min-w-0">
                    <span className="font-medium">{event.actor.fullName}</span>{' '}
                    <span className="text-ink-soft">{t(`collab.events.${event.eventType}`, event.eventType)}</span>{' '}
                    <span className="font-medium">{event.taskTitle}</span>{' '}
                    <span className="text-xs text-ink-soft">· {event.projectName}</span>
                  </span>
                </span>
                <span className="shrink-0 text-xs text-ink-soft">
                  {format(new Date(event.createdAt), 'MM-dd HH:mm')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

function OverdueTable({ items }: { items: OverdueTaskItem[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const columns: Column<OverdueTaskItem>[] = [
    { key: 'title', header: t('tasks.title'), render: (task) => <span className="font-medium">{task.title}</span> },
    { key: 'project', header: t('nav.projects'), render: (task) => <span className="text-ink-soft">{task.projectName}</span> },
    { key: 'due', header: t('projects.dueDate'), render: (task) => <span className="font-medium text-danger">{task.dueDate}</span> },
    { key: 'status', header: t('projects.status'), render: (task) => <StatusBadge status={task.status} /> },
  ]
  return (
    <DataTable
      columns={columns}
      rows={items}
      rowKey={(task) => task.id}
      onRowClick={(task) => navigate(`/tasks/${task.id}`)}
      emptyMessage={t('home.noOverdue')}
    />
  )
}

function AdminView() {
  const { t } = useTranslation()
  const dashboardQuery = useAdminDashboardQuery(true)
  const data = dashboardQuery.data
  if (dashboardQuery.isLoading) return <p className="py-10 text-center text-ink-soft">{t('common.loading')}</p>
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label={t('home.totalUsers')} value={data.totalUsers} to="/users" />
        <StatCard label={t('home.activeUsers')} value={data.activeUsers} to="/users" accent />
        <StatCard label={t('home.teams')} value={data.teamCount} to="/teams" />
        <StatCard label={t('home.projects')} value={data.projectCount} to="/projects" />
        <StatCard label={t('home.tasks')} value={data.taskCount} to="/tasks" accent />
      </div>

      <Section title={t('projects.taskFlow')}>
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <FlowRail summary={data.tasksByStatus} />
        </div>
      </Section>

      <Section title={t('home.overdue')}>
        <OverdueTable items={data.overdueTasks} />
      </Section>

      <RecentActivity />
    </div>
  )
}

function ManagerView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dashboardQuery = useManagerDashboardQuery(true)
  const data = dashboardQuery.data
  if (dashboardQuery.isLoading) return <p className="py-10 text-center text-ink-soft">{t('common.loading')}</p>
  if (!data) return null

  const workloadColumns: Column<WorkloadItem>[] = [
    { key: 'name', header: t('auth.fullName'), render: (item) => <span className="font-medium">{item.fullName}</span> },
    { key: 'assigned', header: t('home.assigned'), render: (item) => <span>{item.assignedTaskCount}</span> },
    { key: 'inProgress', header: t('status.IN_PROGRESS'), render: (item) => <span>{item.inProgressTaskCount}</span> },
    {
      key: 'overdue',
      header: t('tasks.overdue'),
      render: (item) => (
        <span className={item.overdueTaskCount > 0 ? 'font-medium text-danger' : ''}>{item.overdueTaskCount}</span>
      ),
    },
    { key: 'hours', header: t('home.loggedHours'), render: (item) => <span>{item.loggedHours}</span> },
  ]

  const progressColumns: Column<ProjectProgressItem>[] = [
    { key: 'name', header: t('nav.projects'), render: (item) => <span className="font-medium">{item.projectName}</span> },
    {
      key: 'progress',
      header: t('projects.progress'),
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-primary" style={{ width: `${item.progressPercent}%` }} />
          </div>
          <span className="text-xs text-ink-soft">{item.progressPercent}%</span>
        </div>
      ),
    },
    {
      key: 'tasks',
      header: t('home.tasks'),
      render: (item) => (
        <span className="text-ink-soft">
          {item.approvedTaskCount}/{item.taskCount}
        </span>
      ),
    },
    {
      key: 'hours',
      header: t('tasks.hours'),
      render: (item) => (
        <span className="text-ink-soft">
          {item.loggedHours}
          {item.estimatedHours ? ` / ${item.estimatedHours}` : ''}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label={t('home.managedTasks')} value={data.managedTaskCount} to="/tasks" />
        <StatCard label={t('home.awaitingReview')} value={data.tasksAwaitingReview} to="/review" accent />
        <StatCard label={t('home.overdueCount')} value={data.overdueTaskCount} to="/tasks?overdue=true" />
      </div>

      <Section title={t('projects.taskFlow')}>
        <div className="rounded-card border border-line bg-surface p-5 shadow-card">
          <FlowRail summary={data.tasksByStatus} />
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t('home.memberWorkload')}>
          <DataTable
            columns={workloadColumns}
            rows={data.memberWorkload}
            rowKey={(item) => item.userId}
            emptyMessage={t('common.empty')}
          />
        </Section>
        <Section title={t('home.projectProgress')}>
          <DataTable
            columns={progressColumns}
            rows={data.projectProgress}
            rowKey={(item) => item.projectId}
            onRowClick={(item) => navigate(`/projects/${item.projectId}`)}
            emptyMessage={t('common.empty')}
          />
        </Section>
      </div>

      <RecentActivity />
    </div>
  )
}
