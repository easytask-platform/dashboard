import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Plus, Repeat2, TriangleAlert } from 'lucide-react'
import { Can, useAuth } from '@/features/auth/auth-context'
import { useProjectsQuery } from '@/features/projects/api'
import { useTasksQuery, TASK_STATUSES, TASK_PRIORITIES, type TaskFilters, type TaskListItem } from './api'
import { TaskFormDialog } from './TaskFormDialog'
import { PageHeader, SearchInput } from '@/components/ui/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

const selectClass =
  'h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary'

export function TasksPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [searchParams] = useSearchParams()
  const canManage = hasPermission('task:manage')

  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    status: '',
    priority: '',
    projectId: searchParams.get('projectId') ?? '',
    assigneeId: '',
    overdue: '',
    page: 0,
  })
  const tasksQuery = useTasksQuery(filters)
  const projectsQuery = useProjectsQuery({ search: '', status: '', page: 0 })
  const [creating, setCreating] = useState(false)

  const set = (patch: Partial<TaskFilters>) => setFilters((f) => ({ ...f, ...patch, page: 0 }))

  const columns: Column<TaskListItem>[] = [
    {
      key: 'title',
      header: t('tasks.title'),
      render: (task) => (
        <div className="min-w-40">
          <p className="flex items-center gap-1.5 font-medium">
            {task.overdue && <TriangleAlert className="size-3.5 shrink-0 text-danger" aria-label={t('tasks.overdue')} />}
            {task.title}
          </p>
          <p className="text-xs text-ink-soft">{task.projectName}</p>
        </div>
      ),
    },
    { key: 'status', header: t('projects.status'), render: (task) => <StatusBadge status={task.status} /> },
    { key: 'priority', header: t('tasks.priority'), render: (task) => <PriorityBadge priority={task.priority} /> },
    {
      key: 'due',
      header: t('projects.dueDate'),
      render: (task) => (
        <span className={task.overdue ? 'font-medium text-danger' : 'text-ink-soft'}>{task.dueDate ?? '—'}</span>
      ),
    },
    {
      key: 'assignees',
      header: t('tasks.assignees'),
      render: (task) => (
        <span className="text-ink-soft">{task.assignees.map((assignee) => assignee.fullName).join(', ') || '—'}</span>
      ),
    },
    {
      key: 'hours',
      header: t('tasks.hours'),
      render: (task) => (
        <span className="text-ink-soft">
          {task.totalLoggedHours}
          {task.estimatedHours ? ` / ${task.estimatedHours}` : ''}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('nav.tasks')}
        actions={
          <>
            <Can permission="recurring:manage">
              <Link
                to="/tasks/recurring"
                className="flex h-9 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-ink hover:bg-paper"
              >
                <Repeat2 className="size-4" /> {t('recurring.title')}
              </Link>
            </Can>
            {canManage && (
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" /> {t('tasks.create')}
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={filters.search} onChange={(search) => set({ search })} />
        <select
          value={filters.status}
          onChange={(event) => set({ status: event.target.value })}
          aria-label={t('projects.status')}
          className={selectClass}
        >
          <option value="">{t('tasks.allStatuses')}</option>
          {TASK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(event) => set({ priority: event.target.value })}
          aria-label={t('tasks.priority')}
          className={selectClass}
        >
          <option value="">{t('tasks.allPriorities')}</option>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {t(`priority.${priority}`)}
            </option>
          ))}
        </select>
        <select
          value={filters.projectId}
          onChange={(event) => set({ projectId: event.target.value })}
          aria-label={t('nav.projects')}
          className={selectClass}
        >
          <option value="">{t('tasks.allProjects')}</option>
          {projectsQuery.data?.items.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={filters.overdue}
          onChange={(event) => set({ overdue: event.target.value })}
          aria-label={t('tasks.overdue')}
          className={selectClass}
        >
          <option value="">{t('common.all')}</option>
          <option value="true">{t('tasks.overdueOnly')}</option>
          <option value="false">{t('tasks.notOverdue')}</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={tasksQuery.data?.items ?? []}
        rowKey={(task) => task.id}
        onRowClick={(task) => navigate(`/tasks/${task.id}`)}
        loading={tasksQuery.isLoading}
        emptyMessage={t('tasks.empty')}
      />
      <Pagination page={tasksQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />

      <TaskFormDialog
        open={creating}
        editing={null}
        defaultProjectId={filters.projectId || undefined}
        onClose={() => setCreating(false)}
      />
    </div>
  )
}
