import { useTranslation } from 'react-i18next'
import { STATUS_COLORS } from './Badge'
import type { TaskSummary } from '@/features/projects/api'

const SEGMENTS: Array<{ key: keyof TaskSummary; status: string }> = [
  { key: 'toDo', status: 'TO_DO' },
  { key: 'inProgress', status: 'IN_PROGRESS' },
  { key: 'inReview', status: 'IN_REVIEW' },
  { key: 'approved', status: 'APPROVED' },
  { key: 'reopened', status: 'REOPENED' },
  { key: 'cancelled', status: 'CANCELLED' },
]

/**
 * The app's signature motif: the task pipeline as a proportional segmented
 * rail. One glance answers "where is the work stuck?".
 */
export function FlowRail({ summary }: { summary: TaskSummary }) {
  const { t } = useTranslation()
  const total = SEGMENTS.reduce((sum, segment) => sum + summary[segment.key], 0)

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-paper" role="img" aria-label={t('flow.label')}>
        {total > 0 &&
          SEGMENTS.filter((segment) => summary[segment.key] > 0).map((segment) => (
            <div
              key={segment.key}
              style={{
                width: `${(summary[segment.key] / total) * 100}%`,
                backgroundColor: STATUS_COLORS[segment.status],
              }}
            />
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {SEGMENTS.map((segment) => (
          <span key={segment.key} className="flex items-center gap-1.5 text-xs text-ink-soft">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[segment.status] }}
              aria-hidden
            />
            {t(`status.${segment.status}`)}
            <span className="font-semibold text-ink">{summary[segment.key]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
