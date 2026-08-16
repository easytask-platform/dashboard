import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { CheckCheck } from 'lucide-react'
import { useNotificationsQuery, useMarkRead, useMarkAllRead, type Notification } from './api'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function NotificationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ read: '', page: 0 })
  const notificationsQuery = useNotificationsQuery(filters)
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const open = (notification: Notification) => {
    if (!notification.read) markRead.mutate(notification.id)
    if (notification.relatedTaskId) navigate(`/tasks/${notification.relatedTaskId}`)
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={t('nav.notifications')}
        actions={
          <Button variant="secondary" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
            <CheckCheck className="size-4" /> {t('notifications.markAllRead')}
          </Button>
        }
      />

      <div role="tablist" className="mb-4 flex w-fit gap-1 rounded-lg bg-paper p-1">
        {[
          { value: '', label: t('common.all') },
          { value: 'false', label: t('notifications.unread') },
          { value: 'true', label: t('notifications.read') },
        ].map((option) => (
          <button
            key={option.value}
            role="tab"
            aria-selected={filters.read === option.value}
            onClick={() => setFilters({ read: option.value, page: 0 })}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              filters.read === option.value ? 'bg-surface text-ink shadow-card' : 'text-ink-soft hover:text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {notificationsQuery.isLoading ? (
        <p className="py-10 text-center text-ink-soft">{t('common.loading')}</p>
      ) : notificationsQuery.data?.items.length === 0 ? (
        <p className="py-10 text-center text-ink-soft">{t('notifications.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {notificationsQuery.data?.items.map((notification) => (
            <li key={notification.id}>
              <button
                onClick={() => open(notification)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-card border border-line p-4 text-start shadow-card transition-colors hover:border-primary/40',
                  notification.read ? 'bg-surface' : 'bg-primary-soft',
                )}
              >
                <span
                  className={cn('mt-1.5 size-2 shrink-0 rounded-full', notification.read ? 'bg-line' : 'bg-primary')}
                  aria-label={notification.read ? t('notifications.read') : t('notifications.unread')}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{notification.title}</span>
                  <span className="block text-sm text-ink-soft">{notification.message}</span>
                  <span className="mt-1 block text-xs text-ink-soft">
                    {format(new Date(notification.createdAt), 'yyyy-MM-dd HH:mm')}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={notificationsQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />
    </div>
  )
}
