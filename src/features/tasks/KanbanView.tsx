import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ListChecks, Star } from 'lucide-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useAuth } from '@/features/auth/auth-context'
import { useChangeTaskStatus, TASK_STATUSES, type TaskListItem, type TaskStatus } from './api'
import { targetsFor } from './transitions'
import { splitApiError } from '@/lib/api/form-errors'
import { PriorityBadge, STATUS_COLORS, BlockedBadge } from '@/components/ui/Badge'
import { TagChip } from '@/components/ui/TagChip'
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
        'transition-[box-shadow,translate] duration-200 ease-lift hover:-translate-y-0.5 hover:shadow-[var(--shadow-lifted)]',
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        isDragging && 'z-10 opacity-90',
        // AF-06: blocked tasks read differently at a glance without leaving their column
        task.blocked && 'border-s-4 border-s-warning',
      )}
    >
      <p className="flex items-center gap-1.5 text-sm font-medium">
        {task.pinned && <Star className="size-3.5 shrink-0 fill-warning text-warning" aria-hidden />}
        {task.title}
      </p>
      <p className="mb-2 text-xs text-ink-soft">{task.projectName}</p>
      {task.blocked && (
        <div className="mb-2">
          <BlockedBadge reason={task.blockedReason} />
        </div>
      )}
      {task.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <TagChip key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        <span className="flex items-center gap-2">
          {task.checklistTotal > 0 && (
            <span
              className={cn(
                'flex items-center gap-1 text-xs',
                task.checklistDone === task.checklistTotal ? 'text-success' : 'text-ink-soft',
              )}
            >
              <ListChecks className="size-3.5" aria-hidden />
              {task.checklistDone}/{task.checklistTotal}
            </span>
          )}
          {task.dueDate && (
            <span className={cn('text-xs', task.overdue ? 'font-semibold text-danger' : 'text-ink-soft')}>
              {task.dueDate}
            </span>
          )}
        </span>
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

  // Require an 8px drag before a press becomes a drag, so a plain click still
  // fires the card's onClick (opens the task) instead of being eaten as a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  )

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
      sensors={sensors}
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
