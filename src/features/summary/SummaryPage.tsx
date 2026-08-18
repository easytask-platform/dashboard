import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { addDays, format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useWeeklySummaryQuery } from './api'
import type { TaskListItem } from '@/features/tasks/api'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

type SectionKey = 'completed' | 'overdue' | 'upcoming'
const SECTIONS: SectionKey[] = ['completed', 'overdue', 'upcoming']

/** AF-07: the user's week at a glance — done, late, and coming up. */
export function SummaryPage() {
  const { t } = useTranslation()
  // null = server default (current week); navigation always sends explicit Mondays.
  const [weekStart, setWeekStart] = useState<string | null>(null)
  const summaryQuery = useWeeklySummaryQuery(weekStart)
  const summary = summaryQuery.data

  const shiftWeek = (days: number) => {
    if (!summary) return
    setWeekStart(format(addDays(new Date(summary.weekStart), days), 'yyyy-MM-dd'))
  }

  return (
    <div>
      <PageHeader
        title={t('summary.title')}
        actions={
          summary && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="icon" aria-label={t('summary.previousWeek')} onClick={() => shiftWeek(-7)}>
                <ChevronLeft className="size-4 rtl:rotate-180" />
              </Button>
              <span className="text-sm font-medium text-ink-soft">
                {summary.weekStart} → {summary.weekEnd}
              </span>
              <Button variant="secondary" size="icon" aria-label={t('summary.nextWeek')} onClick={() => shiftWeek(7)}>
                <ChevronRight className="size-4 rtl:rotate-180" />
              </Button>
            </div>
          )
        }
      />

      {summaryQuery.isLoading ? (
        <p className="py-10 text-center text-sm text-ink-soft">{t('common.loading')}</p>
      ) : !summary ? (
        <p className="py-10 text-center text-sm text-ink-soft">{t('common.error')}</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {SECTIONS.map((key) => (
            <SummarySection key={key} sectionKey={key} tasks={summary[key]} />
          ))}
        </div>
      )}
    </div>
  )
}

function SummarySection({ sectionKey, tasks }: { sectionKey: SectionKey; tasks: TaskListItem[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const accents: Record<SectionKey, string> = {
    completed: 'text-success',
    overdue: 'text-danger',
    upcoming: 'text-primary',
  }

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h2 className="mb-1 text-sm font-semibold">{t(`summary.${sectionKey}`)}</h2>
      <p className={`mb-3 text-3xl font-bold tracking-tight ${accents[sectionKey]}`}>{tasks.length}</p>
      {tasks.length === 0 ? (
        <p className="text-sm text-ink-soft">{t(`summary.${sectionKey}Empty`)}</p>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="flex w-full items-center justify-between gap-2 py-2 text-start text-sm hover:bg-paper"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{task.title}</span>
                  <span className="text-xs text-ink-soft">{task.projectName}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {task.dueDate && (
                    <span className={task.overdue ? 'text-xs font-semibold text-danger' : 'text-xs text-ink-soft'}>
                      {task.dueDate}
                    </span>
                  )}
                  <StatusBadge status={task.status} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
