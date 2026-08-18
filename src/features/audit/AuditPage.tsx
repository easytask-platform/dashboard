import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { useAuditEventsQuery, AUDIT_EVENT_TYPES, type AuditEvent, type AuditFilters } from './api'
import { useUsersQuery } from '@/features/users/api'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/PageHeader'

const selectClass =
  'h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary'

const TYPE_COLORS: Record<AuditEvent['eventType'], string> = {
  ROLE_CHANGED: 'var(--color-primary)',
  USER_DEACTIVATED: 'var(--color-warning)',
  ADMIN_PASSWORD_RESET: 'var(--color-status-review)',
  PASSWORD_RESET_COMPLETED: 'var(--color-success)',
  REFRESH_TOKEN_REUSE: 'var(--color-danger)',
}

function PersonCell({ person }: { person: AuditEvent['actor'] }) {
  if (!person) return <span className="text-ink-soft">—</span>
  return (
    <span className="flex items-center gap-2">
      <Avatar person={person} size="xs" />
      {person.fullName}
    </span>
  )
}

/** AF-09: sensitive admin actions, visible to admins only (route is audit:read-gated). */
export function AuditPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<AuditFilters>({ eventType: '', actorId: '', from: '', to: '', page: 0 })
  const eventsQuery = useAuditEventsQuery(filters)
  const usersQuery = useUsersQuery({ search: '', role: '', active: '', page: 0 }, true)

  const set = (patch: Partial<AuditFilters>) => setFilters((f) => ({ ...f, ...patch, page: 0 }))

  const columns: Column<AuditEvent>[] = [
    {
      key: 'type',
      header: t('audit.eventType'),
      render: (event) => (
        <Badge label={t(`audit.types.${event.eventType}`, event.eventType)} color={TYPE_COLORS[event.eventType]} />
      ),
    },
    { key: 'actor', header: t('audit.actor'), render: (event) => <PersonCell person={event.actor} /> },
    { key: 'target', header: t('audit.target'), render: (event) => <PersonCell person={event.targetUser} /> },
    {
      key: 'detail',
      header: t('audit.detail'),
      render: (event) => <span className="text-ink-soft">{event.detail ?? '—'}</span>,
    },
    {
      key: 'when',
      header: t('audit.when'),
      render: (event) => (
        <span className="text-ink-soft">{format(new Date(event.createdAt), 'yyyy-MM-dd HH:mm')}</span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title={t('audit.title')} />
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={filters.eventType}
          onChange={(event) => set({ eventType: event.target.value })}
          aria-label={t('audit.eventType')}
          className={selectClass}
        >
          <option value="">{t('audit.allTypes')}</option>
          {AUDIT_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`audit.types.${type}`, type)}
            </option>
          ))}
        </select>
        <select
          value={filters.actorId}
          onChange={(event) => set({ actorId: event.target.value })}
          aria-label={t('audit.actor')}
          className={selectClass}
        >
          <option value="">{t('audit.allActors')}</option>
          {usersQuery.data?.items.map((user) => (
            <option key={user.id} value={user.id}>
              {user.fullName}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from}
          onChange={(event) => set({ from: event.target.value })}
          aria-label={t('audit.from')}
          className={selectClass}
        />
        <input
          type="date"
          value={filters.to}
          onChange={(event) => set({ to: event.target.value })}
          aria-label={t('audit.to')}
          className={selectClass}
        />
      </div>

      <DataTable
        columns={columns}
        rows={eventsQuery.data?.items ?? []}
        rowKey={(event) => event.id}
        loading={eventsQuery.isLoading}
        emptyMessage={t('audit.empty')}
      />
      <Pagination page={eventsQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  )
}
