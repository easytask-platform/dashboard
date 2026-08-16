import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { useAuth } from '@/features/auth/auth-context'
import { useChangeTaskStatus, TASK_STATUSES, type TaskListItem, type TaskStatus } from './api'
import { targetsFor } from './transitions'
import { splitApiError } from '@/lib/api/form-errors'
import { PriorityBadge, STATUS_COLORS } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

function Card({ task, draggable }: { task: TaskListItem; draggable: boolean }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggable,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      onClick={() => !isDragging && navigate(`/tasks/${task.id}`)}
      className={cn(
        'rounded-lg border border-line bg-surface p-3 shadow-card',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging && 'z-10 opacity-90',
      )}
    >
      <p className="text-sm font-medium">{task.title}</p>
      <p className="mb-2 text-xs text-ink-soft">{task.projectName}</p>
      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className={cn('text-xs', task.overdue ? 'font-semibold text-danger' : 'text-ink-soft')}>
            {task.dueDate}
          </span>
        )}
      </div>
    </div>
  )
}

function StatusColumn({
  status,
  tasks,
  draggablePredicate,
  highlight,
}: {
  status: TaskStatus
  tasks: TaskListItem[]
  draggablePredicate: (task: TaskListItem) => boolean
  highlight: boolean
}) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-64 shrink-0 flex-col gap-2 rounded-card border border-line bg-paper p-3 transition-colors',
        highlight && 'border-primary/50 bg-primary-soft',
        isOver && highlight && 'border-primary',
      )}
    >
      <p className="flex items-center gap-2 px-1 text-sm font-semibold">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} aria-hidden />
        {t(`status.${status}`)}
        <span className="text-ink-soft">{tasks.length}</span>
      </p>
      {tasks.map((task) => (
        <Card key={task.id} task={task} draggable={draggablePredicate(task)} />
      ))}
    </div>
  )
}

export function KanbanView({ tasks }: { tasks: TaskListItem[] }) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const toast = useToast()
  const changeStatus = useChangeTaskStatus()
  const [draggingFrom, setDraggingFrom] = useState<TaskStatus | null>(null)

  const permissions = user?.permissions ?? []
  const allowedTargets = draggingFrom ? targetsFor(permissions, draggingFrom) : []

  const onDragEnd = async (event: DragEndEvent) => {
    setDraggingFrom(null)
    const taskId = event.active.id as string
    const target = event.over?.id as TaskStatus | undefined
    const task = tasks.find((candidate) => candidate.id === taskId)
    if (!task || !target || target === task.status) return
    if (!targetsFor(permissions, task.status).includes(target)) return
    try {
      await changeStatus.mutateAsync({ taskId, status: target })
      toast.success(t(`tasks.transitioned.${target}`, t('common.save')))
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    }
  }

  return (
    <DndContext
      onDragStart={(event) => {
        const task = tasks.find((candidate) => candidate.id === event.active.id)
        setDraggingFrom(task?.status ?? null)
      }}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingFrom(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {TASK_STATUSES.map((status) => (
          <StatusColumn
            key={status}
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
            draggablePredicate={(task) => targetsFor(permissions, task.status).length > 0}
            highlight={allowedTargets.includes(status)}
          />
        ))}
      </div>
    </DndContext>
  )
}
