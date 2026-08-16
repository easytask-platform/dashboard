import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import {
  useProjectsQuery,
  useCreateProject,
  useUpdateProject,
  PROJECT_STATUSES,
  type Project,
  type ProjectStatus,
} from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { PageHeader, SearchInput } from '@/components/ui/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextField, TextAreaField, SelectField, FormError } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  PLANNED: 'var(--color-status-todo)',
  ACTIVE: 'var(--color-status-progress)',
  COMPLETED: 'var(--color-status-approved)',
  CANCELLED: 'var(--color-status-cancelled)',
}

export interface ProjectFormValues {
  name: string
  description: string
  status: ProjectStatus
  startDate: string
  dueDate: string
}

interface ProjectFormDialogProps {
  open: boolean
  editing: Project | null
  onClose: () => void
}

export function ProjectFormDialog({ open, editing, onClose }: ProjectFormDialogProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject()
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const form = useForm<ProjectFormValues>({
    values: {
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      status: editing?.status ?? 'PLANNED',
      startDate: editing?.startDate ?? '',
      dueDate: editing?.dueDate ?? '',
    },
  })

  const submit = form.handleSubmit(async (values) => {
    setApiMessage(null)
    setApiFields({})
    const body = {
      name: values.name,
      description: values.description,
      status: values.status,
      startDate: values.startDate || null,
      dueDate: values.dueDate || null,
    }
    try {
      if (editing) await updateProject.mutateAsync({ projectId: editing.id, ...body })
      else await createProject.mutateAsync(body)
      onClose()
      toast.success(t('common.save'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  })

  return (
    <Dialog open={open} onClose={onClose} title={editing ? t('projects.edit') : t('projects.create')} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label={t('common.name')} required error={apiFields.name} {...form.register('name')} />
          <SelectField label={t('projects.status')} error={apiFields.status} {...form.register('status')}>
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`projects.statuses.${status}`)}
              </option>
            ))}
          </SelectField>
        </div>
        <TextAreaField label={t('common.description')} error={apiFields.description} {...form.register('description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={t('projects.startDate')}
            type="date"
            error={apiFields.startDate}
            {...form.register('startDate')}
          />
          <TextField label={t('projects.dueDate')} type="date" error={apiFields.dueDate} {...form.register('dueDate')} />
        </div>
        <FormError message={apiMessage} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={createProject.isPending || updateProject.isPending}>
            {editing ? t('common.save') : t('common.create')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

export function ProjectsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canManage = hasPermission('project:manage')

  const [filters, setFilters] = useState({ search: '', status: '', page: 0 })
  const projectsQuery = useProjectsQuery(filters)
  const [creating, setCreating] = useState(false)

  const columns: Column<Project>[] = [
    { key: 'name', header: t('common.name'), render: (project) => <span className="font-medium">{project.name}</span> },
    {
      key: 'status',
      header: t('projects.status'),
      render: (project) => (
        <Badge label={t(`projects.statuses.${project.status}`)} color={PROJECT_STATUS_COLORS[project.status]} />
      ),
    },
    {
      key: 'progress',
      header: t('projects.progress'),
      render: (project) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-primary" style={{ width: `${project.progressPercent}%` }} />
          </div>
          <span className="text-xs text-ink-soft">{project.progressPercent}%</span>
        </div>
      ),
    },
    {
      key: 'due',
      header: t('projects.dueDate'),
      render: (project) => <span className="text-ink-soft">{project.dueDate ?? '—'}</span>,
    },
    { key: 'members', header: t('teams.members'), render: (project) => <span>{project.memberCount}</span> },
  ]

  return (
    <div>
      <PageHeader
        title={t('nav.projects')}
        actions={
          canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> {t('projects.create')}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <SearchInput value={filters.search} onChange={(search) => setFilters((f) => ({ ...f, search, page: 0 }))} />
        <select
          value={filters.status}
          onChange={(event) => setFilters((f) => ({ ...f, status: event.target.value, page: 0 }))}
          aria-label={t('projects.status')}
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">{t('common.all')}</option>
          {PROJECT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`projects.statuses.${status}`)}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={projectsQuery.data?.items ?? []}
        rowKey={(project) => project.id}
        onRowClick={(project) => navigate(`/projects/${project.id}`)}
        loading={projectsQuery.isLoading}
        emptyMessage={t('projects.empty')}
      />
      <Pagination page={projectsQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />

      <ProjectFormDialog open={creating} editing={null} onClose={() => setCreating(false)} />
    </div>
  )
}
