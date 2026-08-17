import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, RotateCcw, TriangleAlert } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { useProjectsQuery } from '@/features/projects/api'
import { useUsersQuery } from '@/features/users/api'
import { useTasksQuery, useChangeTaskStatus, type TaskListItem, type TaskStatus } from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { PriorityBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextAreaField, FormError } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

const selectClass =
  'h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary'

/**
 * Dedicated review queue (P3-5/D29): everything IN_REVIEW that the caller
 * can review, with inline approve/reopen — no need to open each task.
 */
export function ReviewQueuePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const { hasPermission } = useAuth()

  const [filters, setFilters] = useState({ projectId: '', assigneeId: '', overdue: '', page: 0 })
  const tasksQuery = useTasksQuery({ search: '', status: 'IN_REVIEW', priority: '', ...filters })
  const projectsQuery = useProjectsQuery({ search: '', status: '', page: 0 })
  const canFilterAssignee = hasPermission('user:read')
  const usersQuery = useUsersQuery({ search: '', role: '', active: 'true', page: 0 }, canFilterAssignee)
  const changeStatus = useChangeTaskStatus()

  const [decision, setDecision] = useState<{ task: TaskListItem; status: TaskStatus } | null>(null)
  const [note, setNote] = useState('')
  const [apiMessage, setApiMessage] = useState<string | null>(null)

  const openDecision = (task: TaskListItem, status: TaskStatus) => {
    setNote('')
    setApiMessage(null)
    setDecision({ task, status })
  }

  const confirmDecision = async () => {
    if (!decision) return
    try {
      await changeStatus.mutateAsync({ taskId: decision.task.id, status: decision.status, note })
      toast.success(t(`tasks.transitioned.${decision.status}`))
      setDecision(null)
    } catch (error) {
      setApiMessage(splitApiError(error).message ?? t('common.error'))
    }
  }

  const columns: Column<TaskListItem>[] = [
    {
      key: 'title',
      header: t('tasks.title'),
      render: (task) => (
        <div className="min-w-40">
          <p className="flex items-center gap-1.5 font-medium">
            {task.overdue && (
              <TriangleAlert className="size-3.5 shrink-0 text-danger" aria-label={t('tasks.overdue')} />
            )}
            {task.title}
          </p>
          <p className="text-xs text-ink-soft">{task.projectName}</p>
        </div>
      ),
    },
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
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      className: 'w-56',
      render: (task) => (
        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" onClick={() => openDecision(task, 'APPROVED')}>
            <CheckCircle2 className="size-3.5" /> {t('tasks.actions.APPROVED')}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openDecision(task, 'REOPENED')}>
            <RotateCcw className="size-3.5" /> {t('tasks.actions.REOPENED')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('review.title')} />

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filters.projectId}
          onChange={(event) => setFilters((f) => ({ ...f, projectId: event.target.value, page: 0 }))}
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
        {canFilterAssignee && (
          <select
            value={filters.assigneeId}
            onChange={(event) => setFilters((f) => ({ ...f, assigneeId: event.target.value, page: 0 }))}
            aria-label={t('tasks.assignee')}
            className={selectClass}
          >
            <option value="">{t('tasks.allAssignees')}</option>
            {usersQuery.data?.items.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.fullName}
              </option>
            ))}
          </select>
        )}
        <select
          value={filters.overdue}
          onChange={(event) => setFilters((f) => ({ ...f, overdue: event.target.value, page: 0 }))}
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
        emptyMessage={t('review.empty')}
      />
      <Pagination page={tasksQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />

      <Dialog
        open={decision !== null}
        onClose={() => setDecision(null)}
        title={decision ? `${t(`tasks.actions.${decision.status}`)} — ${decision.task.title}` : ''}
      >
        <div className="space-y-4">
          <TextAreaField label={t('tasks.note')} value={note} onChange={(event) => setNote(event.target.value)} />
          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDecision(null)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={changeStatus.isPending} onClick={() => void confirmDecision()}>
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
