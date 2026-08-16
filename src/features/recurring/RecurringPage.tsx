import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, ListTree, Plus } from 'lucide-react'
import { useProjectsQuery, useProjectMembersQuery } from '@/features/projects/api'
import { TASK_PRIORITIES, type TaskPriority } from '@/features/tasks/api'
import {
  useRecurringRulesQuery,
  useCreateRecurringRule,
  useGeneratedTasksQuery,
  FREQUENCIES,
  type Frequency,
  type RecurringRule,
} from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextField, TextAreaField, SelectField, FormError, FieldWrapper } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

const selectClass =
  'h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary'

interface RuleFormValues {
  projectId: string
  title: string
  description: string
  priority: TaskPriority
  startDate: string
  dueDate: string
  estimatedHours: string
  frequency: Frequency
  interval: string
  recurrenceStartDate: string
  recurrenceEndDate: string
}

export function RecurringPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()

  const [filters, setFilters] = useState({ projectId: '', frequency: '', page: 0 })
  const rulesQuery = useRecurringRulesQuery(filters)
  const projectsQuery = useProjectsQuery({ search: '', status: '', page: 0 })
  const createRule = useCreateRecurringRule()

  const [creating, setCreating] = useState(false)
  const [viewingTasksOf, setViewingTasksOf] = useState<RecurringRule | null>(null)
  const generatedQuery = useGeneratedTasksQuery(viewingTasksOf?.id ?? null)

  const [assigneeIds, setAssigneeIds] = useState<Set<string>>(new Set())
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const form = useForm<RuleFormValues>({
    defaultValues: { priority: 'MEDIUM', frequency: 'WEEKLY', interval: '1' },
  })

  const selectedProjectId = form.watch('projectId')
  const membersQuery = useProjectMembersQuery(selectedProjectId || '')
  const members = useMemo(() => (selectedProjectId ? (membersQuery.data ?? []) : []), [selectedProjectId, membersQuery.data])

  const projectName = (projectId: string) =>
    projectsQuery.data?.items.find((project) => project.id === projectId)?.name ?? '—'

  const isRtl = document.documentElement.dir === 'rtl'
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const openCreate = () => {
    form.reset({
      projectId: '',
      title: '',
      description: '',
      priority: 'MEDIUM',
      startDate: '',
      dueDate: '',
      estimatedHours: '',
      frequency: 'WEEKLY',
      interval: '1',
      recurrenceStartDate: '',
      recurrenceEndDate: '',
    })
    setAssigneeIds(new Set())
    setApiMessage(null)
    setApiFields({})
    setCreating(true)
  }

  const submit = form.handleSubmit(async (values) => {
    setApiMessage(null)
    setApiFields({})
    try {
      await createRule.mutateAsync({
        projectId: values.projectId,
        title: values.title,
        description: values.description,
        priority: values.priority,
        startDate: values.startDate || null,
        dueDate: values.dueDate || null,
        estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : null,
        assigneeIds: [...assigneeIds],
        frequency: values.frequency,
        interval: Number(values.interval),
        recurrenceStartDate: values.recurrenceStartDate,
        recurrenceEndDate: values.recurrenceEndDate || null,
      })
      setCreating(false)
      toast.success(t('common.save'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  })

  const columns: Column<RecurringRule>[] = [
    { key: 'title', header: t('tasks.title'), render: (rule) => <span className="font-medium">{rule.title}</span> },
    { key: 'project', header: t('nav.projects'), render: (rule) => <span className="text-ink-soft">{projectName(rule.projectId)}</span> },
    {
      key: 'frequency',
      header: t('recurring.frequency'),
      render: (rule) => (
        <span>
          {t(`recurring.frequencies.${rule.frequency}`)}
          {rule.interval > 1 ? ` ×${rule.interval}` : ''}
        </span>
      ),
    },
    { key: 'start', header: t('recurring.startsOn'), render: (rule) => <span className="text-ink-soft">{rule.recurrenceStartDate}</span> },
    { key: 'end', header: t('recurring.endsOn'), render: (rule) => <span className="text-ink-soft">{rule.recurrenceEndDate ?? '—'}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      className: 'w-16',
      render: (rule) => (
        <Button variant="ghost" size="icon" aria-label={t('recurring.viewGenerated')} onClick={() => setViewingTasksOf(rule)}>
          <ListTree className="size-4" />
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('recurring.title')}
        actions={
          <>
            <Link to="/tasks" className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
              <BackIcon className="size-4" /> {t('nav.tasks')}
            </Link>
            <Button onClick={openCreate}>
              <Plus className="size-4" /> {t('recurring.create')}
            </Button>
          </>
        }
      />

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
        <select
          value={filters.frequency}
          onChange={(event) => setFilters((f) => ({ ...f, frequency: event.target.value, page: 0 }))}
          aria-label={t('recurring.frequency')}
          className={selectClass}
        >
          <option value="">{t('common.all')}</option>
          {FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {t(`recurring.frequencies.${frequency}`)}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={rulesQuery.data?.items ?? []}
        rowKey={(rule) => rule.id}
        loading={rulesQuery.isLoading}
        emptyMessage={t('recurring.empty')}
      />
      <Pagination page={rulesQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />

      <Dialog open={creating} onClose={() => setCreating(false)} title={t('recurring.create')} wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label={t('nav.projects')} required error={apiFields.projectId} {...form.register('projectId')}>
              <option value="" disabled>
                {t('tasks.selectProject')}
              </option>
              {projectsQuery.data?.items.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </SelectField>
            <TextField label={t('tasks.title')} required error={apiFields.title} {...form.register('title')} />
          </div>
          <TextAreaField label={t('common.description')} error={apiFields.description} {...form.register('description')} />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField label={t('tasks.priority')} error={apiFields.priority} {...form.register('priority')}>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(`priority.${priority}`)}
                </option>
              ))}
            </SelectField>
            <TextField label={t('projects.startDate')} type="date" error={apiFields.startDate} {...form.register('startDate')} />
            <TextField label={t('projects.dueDate')} type="date" error={apiFields.dueDate} {...form.register('dueDate')} />
            <TextField
              label={t('tasks.estimatedHours')}
              type="number"
              min={0}
              step="0.5"
              error={apiFields.estimatedHours}
              {...form.register('estimatedHours')}
            />
            <SelectField label={t('recurring.frequency')} error={apiFields.frequency} {...form.register('frequency')}>
              {FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {t(`recurring.frequencies.${frequency}`)}
                </option>
              ))}
            </SelectField>
            <TextField
              label={t('recurring.interval')}
              type="number"
              min={1}
              required
              error={apiFields.interval}
              {...form.register('interval')}
            />
            <TextField
              label={t('recurring.startsOn')}
              type="date"
              required
              error={apiFields.recurrenceStartDate}
              {...form.register('recurrenceStartDate')}
            />
            <TextField
              label={t('recurring.endsOn')}
              type="date"
              error={apiFields.recurrenceEndDate}
              {...form.register('recurrenceEndDate')}
            />
          </div>

          <FieldWrapper label={t('tasks.assignees')} error={apiFields.assigneeIds}>
            {members.length === 0 ? (
              <p className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink-soft">
                {t('tasks.pickProjectFirst')}
              </p>
            ) : (
              <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-lg border border-line bg-paper p-3">
                {members.map((member) => (
                  <label key={member.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={assigneeIds.has(member.id)}
                      onChange={() =>
                        setAssigneeIds((current) => {
                          const next = new Set(current)
                          if (next.has(member.id)) next.delete(member.id)
                          else next.add(member.id)
                          return next
                        })
                      }
                      className="accent-(--color-primary)"
                    />
                    {member.fullName}
                  </label>
                ))}
              </div>
            )}
          </FieldWrapper>

          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createRule.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={viewingTasksOf !== null}
        onClose={() => setViewingTasksOf(null)}
        title={t('recurring.generatedFor', { title: viewingTasksOf?.title })}
        wide
      >
        {generatedQuery.isLoading ? (
          <p className="py-6 text-center text-sm text-ink-soft">{t('common.loading')}</p>
        ) : generatedQuery.data?.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">{t('recurring.noGenerated')}</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {generatedQuery.data?.items.map((task) => (
              <li key={task.id}>
                <button
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-start hover:bg-paper"
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{task.title}</span>
                    <span className="block text-xs text-ink-soft">{task.dueDate ?? ''}</span>
                  </span>
                  <StatusBadge status={task.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </div>
  )
}
