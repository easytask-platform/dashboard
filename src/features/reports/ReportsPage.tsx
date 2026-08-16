import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTeamsQuery } from '@/features/teams/api'
import { useProjectsQuery } from '@/features/projects/api'
import {
  useWorkloadReportQuery,
  useProjectProgressReportQuery,
  type WorkloadItem,
  type ProjectProgressItem,
} from '@/features/dashboard/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { cn } from '@/lib/utils'

const selectClass =
  'h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary'

type Report = 'workload' | 'progress'

export function ReportsPage() {
  const { t } = useTranslation()
  const [report, setReport] = useState<Report>('workload')

  return (
    <div>
      <PageHeader title={t('nav.reports')} />
      <div role="tablist" className="mb-5 flex gap-1 rounded-lg bg-paper p-1 w-fit">
        {(['workload', 'progress'] as Report[]).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={report === key}
            onClick={() => setReport(key)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              report === key ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink',
            )}
          >
            {t(`reports.${key}`)}
          </button>
        ))}
      </div>
      {report === 'workload' ? <WorkloadReport /> : <ProgressReport />}
    </div>
  )
}

function WorkloadReport() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState({ teamId: '', projectId: '', from: '', to: '', page: 0 })
  const reportQuery = useWorkloadReportQuery(filters)
  const teamsQuery = useTeamsQuery({ search: '', page: 0 })
  const projectsQuery = useProjectsQuery({ search: '', status: '', page: 0 })

  const columns: Column<WorkloadItem>[] = [
    { key: 'name', header: t('auth.fullName'), render: (item) => <span className="font-medium">{item.fullName}</span> },
    { key: 'assigned', header: t('home.assigned'), render: (item) => <span>{item.assignedTaskCount}</span> },
    { key: 'inProgress', header: t('status.IN_PROGRESS'), render: (item) => <span>{item.inProgressTaskCount}</span> },
    {
      key: 'overdue',
      header: t('tasks.overdue'),
      render: (item) => (
        <span className={item.overdueTaskCount > 0 ? 'font-medium text-danger' : ''}>{item.overdueTaskCount}</span>
      ),
    },
    { key: 'hours', header: t('home.loggedHours'), render: (item) => <span>{item.loggedHours}</span> },
  ]

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filters.teamId}
          onChange={(event) => setFilters((f) => ({ ...f, teamId: event.target.value, page: 0 }))}
          aria-label={t('nav.teams')}
          className={selectClass}
        >
          <option value="">{t('reports.allTeams')}</option>
          {teamsQuery.data?.items.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
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
        <DateRange
          from={filters.from}
          to={filters.to}
          onChange={(from, to) => setFilters((f) => ({ ...f, from, to, page: 0 }))}
        />
      </div>
      <DataTable
        columns={columns}
        rows={reportQuery.data?.items ?? []}
        rowKey={(item) => item.userId}
        loading={reportQuery.isLoading}
        emptyMessage={t('common.empty')}
      />
      <Pagination page={reportQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  )
}

function ProgressReport() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState({ projectId: '', from: '', to: '', page: 0 })
  const reportQuery = useProjectProgressReportQuery(filters)
  const projectsQuery = useProjectsQuery({ search: '', status: '', page: 0 })

  const columns: Column<ProjectProgressItem>[] = [
    { key: 'name', header: t('nav.projects'), render: (item) => <span className="font-medium">{item.projectName}</span> },
    {
      key: 'progress',
      header: t('projects.progress'),
      render: (item) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-primary" style={{ width: `${item.progressPercent}%` }} />
          </div>
          <span className="text-xs text-ink-soft">{item.progressPercent}%</span>
        </div>
      ),
    },
    {
      key: 'approved',
      header: t('reports.approvedOfTotal'),
      render: (item) => (
        <span className="text-ink-soft">
          {item.approvedTaskCount}/{item.taskCount}
        </span>
      ),
    },
    {
      key: 'overdue',
      header: t('tasks.overdue'),
      render: (item) => (
        <span className={item.overdueTaskCount > 0 ? 'font-medium text-danger' : ''}>{item.overdueTaskCount}</span>
      ),
    },
    {
      key: 'hours',
      header: t('tasks.hours'),
      render: (item) => (
        <span className="text-ink-soft">
          {item.loggedHours}
          {item.estimatedHours ? ` / ${item.estimatedHours}` : ''}
        </span>
      ),
    },
  ]

  return (
    <div>
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
        <DateRange
          from={filters.from}
          to={filters.to}
          onChange={(from, to) => setFilters((f) => ({ ...f, from, to, page: 0 }))}
        />
      </div>
      <DataTable
        columns={columns}
        rows={reportQuery.data?.items ?? []}
        rowKey={(item) => item.projectId}
        loading={reportQuery.isLoading}
        emptyMessage={t('common.empty')}
      />
      <Pagination page={reportQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  )
}

function DateRange({ from, to, onChange }: { from: string; to: string; onChange: (from: string, to: string) => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="date"
        value={from}
        onChange={(event) => onChange(event.target.value, to)}
        aria-label={t('reports.from')}
        className={selectClass}
      />
      <span className="text-ink-soft">–</span>
      <input
        type="date"
        value={to}
        onChange={(event) => onChange(from, event.target.value)}
        aria-label={t('reports.to')}
        className={selectClass}
      />
    </div>
  )
}
