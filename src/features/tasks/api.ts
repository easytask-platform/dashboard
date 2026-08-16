import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { PageResponse } from '@/lib/api/types'

export type TaskStatus = 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'APPROVED' | 'REOPENED' | 'CANCELLED'
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export const TASK_STATUSES: TaskStatus[] = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'REOPENED', 'CANCELLED']
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export interface TaskListItem {
  id: string
  projectId: string
  projectName: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  startDate: string | null
  dueDate: string | null
  estimatedHours: number | null
  totalLoggedHours: number
  overdue: boolean
  assignees: Array<{ id: string; fullName: string }>
}

export interface TaskDetails extends TaskListItem {
  description: string | null
  assignees: Array<{ id: string; fullName: string; email?: string }>
  createdAt: string
  updatedAt: string
}

export interface TaskFilters {
  search: string
  status: string
  priority: string
  projectId: string
  assigneeId: string
  overdue: string
  page: number
  /** Board/calendar views load a larger window than the table. */
  size?: number
}

export function useTasksQuery(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, size: filters.size ?? 20 }
      for (const key of ['search', 'status', 'priority', 'projectId', 'assigneeId', 'overdue'] as const) {
        if (filters[key]) params[key] = filters[key]
      }
      return (await api.get<PageResponse<TaskListItem>>('/tasks', { params })).data
    },
  })
}

export function useTaskQuery(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => (await api.get<TaskDetails>(`/tasks/${taskId}`)).data,
  })
}

export interface TaskBody {
  projectId?: string
  title: string
  description: string
  priority: TaskPriority
  startDate: string | null
  dueDate: string | null
  estimatedHours: number | null
  assigneeIds: string[]
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: TaskBody) => (await api.post<TaskDetails>('/tasks', body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, ...body }: TaskBody & { taskId: string }) =>
      (await api.patch<TaskDetails>(`/tasks/${taskId}`, body)).data,
    onSuccess: (_data, { taskId }) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })
}

export function useChangeTaskStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, status, note }: { taskId: string; status: TaskStatus; note?: string }) =>
      (await api.patch<TaskDetails>(`/tasks/${taskId}/status`, { status, note: note || undefined })).data,
    onSuccess: (_data, { taskId }) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      void queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
    },
  })
}
