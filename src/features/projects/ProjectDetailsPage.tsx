import { useState } from 'react'
import { useParams, Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Pencil } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import {
  useProjectQuery,
  useProjectMembersQuery,
  useAddProjectMember,
  useRemoveProjectMember,
} from './api'
import { ProjectFormDialog, PROJECT_STATUS_COLORS } from './ProjectsPage'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { FlowRail } from '@/components/ui/FlowRail'
import { MembersManager } from '@/components/MembersManager'

export function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const canManage = hasPermission('project:manage')
  const [editing, setEditing] = useState(false)

  const projectQuery = useProjectQuery(projectId!)
  const membersQuery = useProjectMembersQuery(projectId!)
  const addMember = useAddProjectMember()
  const removeMember = useRemoveProjectMember()

  const project = projectQuery.data
  const isRtl = document.documentElement.dir === 'rtl'
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  if (projectQuery.isLoading) {
    return <p className="py-10 text-center text-ink-soft">{t('common.loading')}</p>
  }
  if (!project) {
    return <p className="py-10 text-center text-ink-soft">{t('common.notFound')}</p>
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/projects" aria-label={t('nav.projects')} className="text-ink-soft hover:text-ink">
            <BackIcon className="size-5" />
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
          <Badge label={t(`projects.statuses.${project.status}`)} color={PROJECT_STATUS_COLORS[project.status]} />
        </div>
        {canManage && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> {t('common.edit')}
          </Button>
        )}
      </div>

      {project.description && <p className="max-w-2xl text-sm text-ink-soft">{project.description}</p>}

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-card border border-line bg-surface p-5 shadow-card lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">{t('projects.taskFlow')}</h2>
            <span className="text-2xl font-bold text-primary">{project.progressPercent}%</span>
          </div>
          <FlowRail summary={project.taskSummary} />
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div>
              <dt className="text-ink-soft">{t('projects.startDate')}</dt>
              <dd className="font-medium">{project.startDate ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">{t('projects.dueDate')}</dt>
              <dd className="font-medium">{project.dueDate ?? '—'}</dd>
            </div>
          </dl>
          <div className="mt-4 border-t border-line pt-4">
            <Link to={`/tasks?projectId=${project.id}`} className="text-sm font-medium text-primary hover:underline">
              {t('projects.viewTasks')}
            </Link>
          </div>
        </section>

        <section className="rounded-card border border-line bg-surface p-5 shadow-card">
          <h2 className="mb-4 font-semibold">
            {t('teams.members')} <span className="text-ink-soft">({project.memberCount})</span>
          </h2>
          <MembersManager
            members={membersQuery.data}
            loading={membersQuery.isLoading}
            canManage={canManage}
            onAdd={(userId) => addMember.mutateAsync({ projectId: project.id, userId })}
            onRemove={(userId) => removeMember.mutateAsync({ projectId: project.id, userId })}
          />
        </section>
      </div>

      <ProjectFormDialog open={editing} editing={project} onClose={() => setEditing(false)} />
    </div>
  )
}
