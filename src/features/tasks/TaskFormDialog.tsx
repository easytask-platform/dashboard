import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useProjectsQuery, useProjectMembersQuery } from '@/features/projects/api'
import { useCreateTask, useUpdateTask, TASK_PRIORITIES, type TaskDetails, type TaskPriority } from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { TextField, TextAreaField, SelectField, FormError, FieldWrapper } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

interface TaskFormValues {
  projectId: string
  title: string
  description: string
  priority: TaskPriority
  startDate: string
  dueDate: string
  estimatedHours: string
}

interface TaskFormDialogProps {
  open: boolean
  editing: TaskDetails | null
  /** Pre-select a project (from the project details page). */
  defaultProjectId?: string
  onClose: () => void
}

export function TaskFormDialog({ open, editing, defaultProjectId, onClose }: TaskFormDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(
    () => new Set(editing?.assignees.map((assignee) => assignee.id)),
  )

  const form = useForm<TaskFormValues>({
    values: {
      projectId: editing?.projectId ?? defaultProjectId ?? '',
      title: editing?.title ?? '',
      description: editing?.description ?? '',
      priority: editing?.priority ?? 'MEDIUM',
      startDate: editing?.startDate ?? '',
      dueDate: editing?.dueDate ?? '',
      estimatedHours: editing?.estimatedHours?.toString() ?? '',
    },
  })

  // Projects the user can create tasks in; assignees come from the picked project.
  const projectsQuery = useProjectsQuery({ search: '', status: '', page: 0 })
  const selectedProjectId = form.watch('projectId')
  const membersQuery = useProjectMembersQuery(selectedProjectId || editing?.projectId || '')
  const members = useMemo(
    () => (selectedProjectId || editing ? (membersQuery.data ?? []) : []),
    [selectedProjectId, editing, membersQuery.data],
  )

  const toggleAssignee = (userId: string) => {
    setAssigneeIds((current) => {
      const next = new Set(current)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const submit = form.handleSubmit(async (values) => {
    setApiMessage(null)
    setApiFields({})
    const body = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      startDate: values.startDate || null,
      dueDate: values.dueDate || null,
      estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
      assigneeIds: [...assigneeIds],
    }
    try {
      if (editing) await updateTask.mutateAsync({ taskId: editing.id, ...body })
      else await createTask.mutateAsync({ ...body, projectId: values.projectId })
      onClose()
      toast.success(t('common.save'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  })

  return (
    <Dialog open={open} onClose={onClose} title={editing ? t('tasks.edit') : t('tasks.create')} wide>
      <form onSubmit={submit} className="space-y-4">
        {!editing && (
          <SelectField
            label={t('nav.projects')}
            required
            error={apiFields.projectId}
            {...form.register('projectId')}
          >
            <option value="" disabled>
              {t('tasks.selectProject')}
            </option>
            {projectsQuery.data?.items.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </SelectField>
        )}
        <TextField label={t('tasks.title')} required error={apiFields.title} {...form.register('title')} />
        <TextAreaField
          label={t('common.description')}
          error={apiFields.description}
          {...form.register('description')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label={t('tasks.priority')} error={apiFields.priority} {...form.register('priority')}>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(`priority.${priority}`)}
              </option>
            ))}
          </SelectField>
          <TextField
            label={t('tasks.estimatedHours')}
            type="number"
            min={0}
            step="0.5"
            error={apiFields.estimatedHours}
            {...form.register('estimatedHours')}
          />
          <TextField
            label={t('projects.startDate')}
            type="date"
            error={apiFields.startDate}
            {...form.register('startDate')}
          />
          <TextField
            label={t('projects.dueDate')}
            type="date"
            error={apiFields.dueDate}
            {...form.register('dueDate')}
          />
        </div>

        <FieldWrapper label={t('tasks.assignees')} error={apiFields.assigneeIds}>
          {members.length === 0 ? (
            <p className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink-soft">
              {t('tasks.pickProjectFirst')}
            </p>
          ) : (
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-line bg-paper p-3">
              {members.map((member) => (
                <label key={member.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={assigneeIds.has(member.id)}
                    onChange={() => toggleAssignee(member.id)}
                    className="accent-(--color-primary)"
                  />
                  {member.fullName}
                  <span className="text-xs text-ink-soft">{member.email}</span>
                </label>
              ))}
            </div>
          )}
        </FieldWrapper>

        <FormError message={apiMessage} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createTask.isPending || updateTask.isPending}>
            {editing ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
