import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { TaskListItem } from '@/features/tasks/api'

/**
 * Personal weekly summary (P4-9/D38, AF-07): completed (approved that week),
 * overdue, and upcoming (due within the week) — always for the caller.
 */
export interface WeeklySummary {
  weekStart: string
  weekEnd: string
  completed: TaskListItem[]
  overdue: TaskListItem[]
  upcoming: TaskListItem[]
}

export function useWeeklySummaryQuery(weekStart: string | null) {
  return useQuery({
    queryKey: ['weekly-summary', weekStart],
    queryFn: async () =>
      (
        await api.get<WeeklySummary>('/me/weekly-summary', {
          params: weekStart ? { weekStart } : undefined,
        })
      ).data,
  })
}
