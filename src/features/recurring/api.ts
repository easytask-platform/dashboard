import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { PageResponse } from '@/lib/api/types'
import type { TaskListItem, TaskPriority } from '@/features/tasks/api'

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export const FREQUENCIES: Frequency[] = ['DAILY', 'WEEKLY', 'MONTHLY']

export interface RecurringRule {
  id: string
  projectId: string
  title: string
  frequency: Frequency
  interval: number
  recurrenceStartDate: string
  recurrenceEndDate: string | null
  assigneeIds: string[]
}

export interface RecurringFilters {
  projectId: string
  frequency: string
  page: number
}

export function useRecurringRulesQuery(filters: RecurringFilters) {
  return useQuery({
    queryKey: ['recurring-rules', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, size: 20 }
      if (filters.projectId) params.projectId = filters.projectId
      if (filters.frequency) params.frequency = filters.frequency
      return (await api.get<PageResponse<RecurringRule>>('/recurring-task-rules', { params })).data
    },
  })
}

export interface RecurringRuleBody {
  projectId: string
  title: string
  description: string
  priority: TaskPriority
  startDate: string | null
  dueDate: string | null
  estimatedHours: number | null
  assigneeIds: string[]
  frequency: Frequency
  interval: number
  recurrenceStartDate: string
  recurrenceEndDate: string | null
}

export function useCreateRecurringRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: RecurringRuleBody) =>
      (await api.post<RecurringRule>('/recurring-task-rules', body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring-rules'] }),
  })
}

export function useGeneratedTasksQuery(ruleId: string | null) {
  return useQuery({
    queryKey: ['recurring-tasks', ruleId],
    queryFn: async () =>
      (await api.get<PageResponse<TaskListItem>>(`/recurring-task-rules/${ruleId}/tasks`)).data,
    enabled: ruleId !== null,
  })
}
