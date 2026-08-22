import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, OctagonPause, Pencil, Star } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { usePinTask, useUnpinTask } from '@/features/focus/api'
import { useTaskQuery, useChangeTaskStatus, useSetTaskBlocked, type TaskStatus } from './api'
import { targetsFor } from './transitions'
import { TaskFormDialog } from './TaskFormDialog'
import { ChecklistSection } from './ChecklistSection'
import { splitApiError } from '@/lib/api/form-errors'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge, PriorityBadge, BlockedBadge } from '@/components/ui/Badge'
import { TagChip } from '@/components/ui/TagChip'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextAreaField, FormError } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { TaskTabs } from './TaskTabs'

/** Sensible display order for the status dropdown. */
const TRANSITION_ORDER: TaskStatus[] = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'REOPENED', 'CANCELLED']

const selectClass =
  'h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary disabled:opacity-50'

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
  const setBlocked = useSetTaskBlocked()
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [blockError, setBlockError] = useState<string | null>(null)
  const pinTask = usePinTask()
  const unpinTask = useUnpinTask()

  const task = taskQuery.data
  const isRtl = document.documentElement.dir === 'rtl'
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  if (taskQuery.isLoading) return <p className="py-10 text-center text-ink-soft">{t('common.loading')}</p>
  if (!task) return <p className="py-10 text-center text-ink-soft">{t('common.notFound')}</p>

  const targets = targetsFor(user?.permissions ?? [], task.status).sort(
    (a, b) => TRANSITION_ORDER.indexOf(a) - TRANSITION_ORDER.indexOf(b),
  )
  const canManage = hasPermission('task:manage')
  // D36/D37: assignees and managers may toggle the blocked flag and tick checklist items.
  const canActOnTask = canManage || task.assignees.some((assignee) => assignee.id === user?.id)

  const toggleBlocked = async () => {
    setBlockError(null)
    try {
      await setBlocked.mutateAsync(
        task.blocked
          ? { taskId: task.id, blocked: false }
          : { taskId: task.id, blocked: true, reason: blockReason.trim() },
      )
      setBlockDialogOpen(false)
      setBlockReason('')
      toast.success(t(task.blocked ? 'tasks.unblocked' : 'tasks.markedBlocked'))
    } catch (error) {
      const message = splitApiError(error).message ?? t('common.error')
      if (task.blocked) toast.error(message)
      else setBlockError(message)
    }
  }

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
          {task.blocked && <BlockedBadge reason={task.blockedReason} />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={task.pinned ? t('focus.unpin') : t('focus.pin')}
            aria-pressed={task.pinned}
            disabled={pinTask.isPending || unpinTask.isPending}
            onClick={() =>
              (task.pinned ? unpinTask : pinTask)
                .mutateAsync(task.id)
                .then(() => toast.success(t(task.pinned ? 'focus.unpinned' : 'focus.pinned')))
                .catch((error) => toast.error(splitApiError(error).message ?? t('common.error')))
            }
          >
            <Star className={task.pinned ? 'size-4.5 fill-warning text-warning' : 'size-4.5'} />
          </Button>
          {targets.length > 0 && (
            <select
              aria-label={t('tasks.changeStatus')}
              className={selectClass}
              value=""
              disabled={changeStatus.isPending}
              onChange={(event) => {
                const status = event.target.value as TaskStatus
                if (!status) return
                if (needsNote(status)) setNoteFor(status)
                else applyTransition(status)
              }}
            >
              <option value="" disabled>
                {t('tasks.changeStatus')}
              </option>
              {targets.map((status) => (
                <option key={status} value={status}>
                  {t(`status.${status}`)}
                </option>
              ))}
            </select>
          )}
          {canActOnTask && (
            <Button
              variant="secondary"
              disabled={setBlocked.isPending}
              onClick={() => (task.blocked ? void toggleBlocked() : setBlockDialogOpen(true))}
            >
              <OctagonPause className="size-4" />
              {task.blocked ? t('tasks.unblock') : t('tasks.markBlocked')}
            </Button>
          )}
          {canManage && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      {task.blocked && task.blockedReason && (
        <p className="rounded-lg border border-dashed border-warning/60 bg-warning-soft px-4 py-2.5 text-sm text-warning">
          {t('tasks.blockedReason', { reason: task.blockedReason })}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <p className="text-sm text-ink-soft">
              <Link to={`/projects/${task.projectId}`} className="font-medium text-primary hover:underline">
                {task.projectName}
              </Link>
            </p>
            {task.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <TagChip key={tag.id} name={tag.name} color={tag.color} />
                ))}
              </div>
            )}
            {task.description && <p className="mt-3 text-sm whitespace-pre-wrap">{task.description}</p>}
          </section>
          <ChecklistSection taskId={task.id} canManage={canManage} canToggle={canActOnTask} />
        </div>

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
                      <span key={assignee.id} className="flex items-center gap-1.5 rounded-full bg-primary-soft py-0.5 pe-2.5 ps-1 text-xs font-medium text-primary-deep">
                        <Avatar person={assignee} size="xs" />
                        {assignee.fullName}
                      </span>
                    ))}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <TaskTabs taskId={task.id} projectId={task.projectId} />

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

      <Dialog open={blockDialogOpen} onClose={() => setBlockDialogOpen(false)} title={t('tasks.markBlocked')}>
        <div className="space-y-4">
          <TextAreaField
            label={t('tasks.blockReasonLabel')}
            required
            value={blockReason}
            onChange={(event) => setBlockReason(event.target.value)}
            maxLength={300}
          />
          <FormError message={blockError} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBlockDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={setBlocked.isPending || !blockReason.trim()} onClick={() => void toggleBlocked()}>
              {t('tasks.markBlocked')}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
