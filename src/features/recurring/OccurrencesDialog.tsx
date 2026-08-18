import { useTranslation } from 'react-i18next'
import { CalendarOff, RotateCcw } from 'lucide-react'
import {
  useOccurrencesQuery,
  useSkipOccurrence,
  useRestoreOccurrence,
  type RecurringRule,
} from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'

/**
 * Upcoming occurrences with skip/restore (P4-10/D41, AF-11). Only future,
 * not-yet-generated dates are listed; skipping one leaves the rule running.
 */
export function OccurrencesDialog({ rule, onClose }: { rule: RecurringRule | null; onClose: () => void }) {
  const { t } = useTranslation()
  const toast = useToast()
  const occurrencesQuery = useOccurrencesQuery(rule?.id ?? null)
  const skip = useSkipOccurrence(rule?.id ?? '')
  const restore = useRestoreOccurrence(rule?.id ?? '')

  const onError = (error: unknown) => toast.error(splitApiError(error).message ?? t('common.error'))
  const busy = skip.isPending || restore.isPending

  return (
    <Dialog open={rule !== null} onClose={onClose} title={t('recurring.occurrencesTitle', { title: rule?.title })}>
      {occurrencesQuery.isLoading ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('common.loading')}</p>
      ) : (occurrencesQuery.data?.length ?? 0) === 0 ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('recurring.noOccurrences')}</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {occurrencesQuery.data?.map((occurrence) => (
            <li key={occurrence.date} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span
                className={
                  occurrence.skipped ? 'text-sm text-ink-soft line-through' : 'text-sm font-medium'
                }
              >
                {occurrence.date}
                {occurrence.skipped && (
                  <span className="ms-2 text-xs text-warning no-underline">{t('recurring.skipped')}</span>
                )}
              </span>
              {occurrence.skipped ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => restore.mutateAsync(occurrence.date).catch(onError)}
                >
                  <RotateCcw className="size-3.5" /> {t('recurring.restore')}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => skip.mutateAsync(occurrence.date).catch(onError)}
                >
                  <CalendarOff className="size-3.5" /> {t('recurring.skip')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-ink-soft">{t('recurring.skipHint')}</p>
    </Dialog>
  )
}
