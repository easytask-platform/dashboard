import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function Badge({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', className)}
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {label}
    </span>
  )
}

export const STATUS_COLORS: Record<string, string> = {
  TO_DO: 'var(--color-status-todo)',
  IN_PROGRESS: 'var(--color-status-progress)',
  IN_REVIEW: 'var(--color-status-review)',
  APPROVED: 'var(--color-status-approved)',
  REOPENED: 'var(--color-status-reopened)',
  CANCELLED: 'var(--color-status-cancelled)',
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  return <Badge label={t(`status.${status}`, status)} color={STATUS_COLORS[status] ?? 'var(--color-ink-soft)'} />
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'var(--color-priority-low)',
  MEDIUM: 'var(--color-priority-medium)',
  HIGH: 'var(--color-priority-high)',
  CRITICAL: 'var(--color-priority-critical)',
}

export function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation()
  return <Badge label={t(`priority.${priority}`, priority)} color={PRIORITY_COLORS[priority] ?? 'var(--color-ink-soft)'} />
}

/** Active / inactive user state. */
export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useTranslation()
  return (
    <Badge
      label={active ? t('common.active') : t('common.inactive')}
      color={active ? 'var(--color-success)' : 'var(--color-status-cancelled)'}
    />
  )
}

export function RoleBadge({ role }: { role: string }) {
  return <Badge label={role} color="var(--color-primary)" />
}
