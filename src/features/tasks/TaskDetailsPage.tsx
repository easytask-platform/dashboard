import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { useTaskQuery, useChangeTaskStatus, type TaskStatus } from './api'
import { targetsFor } from './transitions'
import { TaskFormDialog } from './TaskFormDialog'
import { splitApiError } from '@/lib/api/form-errors'
import { StatusBadge, PriorityBadge, STATUS_COLORS } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextAreaField, FormError } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { TaskTabs } from './TaskTabs'

/** Sensible display order when several transitions are available. */
const TRANSITION_ORDER: TaskStatus[] = ['IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'REOPENED', 'CANCELLED']

export function TaskDetailsPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const { t } = useTranslation()
  const { user, hasPermission } = useAuth()
  const toast = useToast()
  const taskQuery = useTaskQuery(taskId!)
  const changeStatus = useChangeTaskStatus()

  const [editing, setEditing] = useState(false)
  const [noteFor, setNoteFor] = useState<TaskStatus | null>(null)
  const [note, setNote] = useState('')
  const [apiMessage, setApiMessage] = useState<string | null>(null)

  const task = taskQuery.data
  const isRtl = document.documentElement.dir === 'rtl'
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  if (taskQuery.isLoading) return <p className="py-10 text-center text-ink-soft">{t('common.loading')}</p>
  if (!task) return <p className="py-10 text-center text-ink-soft">{t('common.notFound')}</p>

  const targets = targetsFor(user?.permissions ?? [], task.status).sort(
    (a, b) => TRANSITION_ORDER.indexOf(a) - TRANSITION_ORDER.indexOf(b),
  )
  const canManage = hasPermission('task:manage')

  const applyTransition = async (status: TaskStatus, transitionNote?: string) => {
    setApiMessage(null)
    try {
      await changeStatus.mutateAsync({ taskId: task.id, status, note: transitionNote })
      setNoteFor(null)
      setNote('')
      toast.success(t(`tasks.transitioned.${status}`, t('common.save')))
    } catch (error) {
      const message = splitApiError(error).message ?? t('common.error')
      if (noteFor) setApiMessage(message)
      else toast.error(message)
    }
  }

  // Review/cancel decisions carry an optional note; forward moves don't.
  const needsNote = (status: TaskStatus) => ['APPROVED', 'REOPENED', 'CANCELLED'].includes(status)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/tasks" aria-label={t('nav.tasks')} className="text-ink-soft hover:text-ink">
            <BackIcon className="size-5" />
          </Link>
          <h1 className="truncate text-xl font-semibold tracking-tight">{task.title}</h1>
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {targets.map((status) => (
            <Button
              key={status}
              variant={status === 'CANCELLED' ? 'danger' : 'primary'}
              style={status === 'CANCELLED' ? undefined : { backgroundColor: STATUS_COLORS[status] }}
              disabled={changeStatus.isPending}
              onClick={() => (needsNote(status) ? setNoteFor(status) : applyTransition(status))}
            >
              {t(`tasks.actions.${status}`)}
            </Button>
          ))}
          {canManage && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-card border border-line bg-surface p-5 shadow-card lg:col-span-2">
          <p className="text-sm text-ink-soft">
            <Link to={`/projects/${task.projectId}`} className="font-medium text-primary hover:underline">
              {task.projectName}
            </Link>
          </p>
          {task.description && <p className="mt-3 text-sm whitespace-pre-wrap">{task.description}</p>}
        </section>

        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">{t('projects.startDate')}</dt>
              <dd className="font-medium">{task.startDate ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">{t('projects.dueDate')}</dt>
              <dd className={task.overdue ? 'font-medium text-danger' : 'font-medium'}>{task.dueDate ?? '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">{t('tasks.hours')}</dt>
              <dd className="font-medium">
                {task.totalLoggedHours}
                {task.estimatedHours ? ` / ${task.estimatedHours}` : ''}
              </dd>
            </div>
            <div>
              <dt className="mb-1.5 text-ink-soft">{t('tasks.assignees')}</dt>
              <dd className="flex flex-wrap gap-1.5">
                {task.assignees.length === 0
                  ? '—'
                  : task.assignees.map((assignee) => (
                      <span key={assignee.id} className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary-deep">
                        {assignee.fullName}
                      </span>
                    ))}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <TaskTabs taskId={task.id} />

      <TaskFormDialog open={editing} editing={task} onClose={() => setEditing(false)} />

      <Dialog
        open={noteFor !== null}
        onClose={() => setNoteFor(null)}
        title={noteFor ? t(`tasks.actions.${noteFor}`) : ''}
      >
        <div className="space-y-4">
          <TextAreaField label={t('tasks.note')} value={note} onChange={(event) => setNote(event.target.value)} />
          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setNoteFor(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant={noteFor === 'CANCELLED' ? 'danger' : 'primary'}
              disabled={changeStatus.isPending}
              onClick={() => noteFor && applyTransition(noteFor, note)}
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
