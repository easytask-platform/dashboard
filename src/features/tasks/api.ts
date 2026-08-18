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
  assignees: Array<{ id: string; fullName: string; avatarUrl: string | null }>
  tags: Array<{ id: string; name: string; color: string }>
  /** Blocked/waiting flag (P4-6/D37) — independent of the status machine. */
  blocked: boolean
  blockedReason: string | null
  /** Checklist progress for card display (P4-5/AF-02). */
  checklistDone: number
  checklistTotal: number
  /** True when the current user pinned this task to their focus board (P4-7/FR-29). */
  pinned: boolean
}

export interface TaskDetails extends TaskListItem {
  description: string | null
  assignees: Array<{ id: string; fullName: string; email?: string; avatarUrl: string | null }>
  createdAt: string
  updatedAt: string
}

export interface TaskFilters {
  search: string
  status: string
  priority: string
  projectId: string
  assigneeId: string
  tagId: string
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
      for (const key of ['search', 'status', 'priority', 'projectId', 'assigneeId', 'tagId', 'overdue'] as const) {
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
  tagIds: string[]
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

/** Checklist sub-items (P4-5/D36, AF-01/02). */
export interface ChecklistItem {
  id: string
  taskId: string
  title: string
  done: boolean
  position: number
}

export function useChecklistQuery(taskId: string) {
  return useQuery({
    queryKey: ['task-checklist', taskId],
    queryFn: async () => (await api.get<{ items: ChecklistItem[] }>(`/tasks/${taskId}/checklist`)).data.items,
  })
}

function useChecklistMutation<Args>(taskId: string, mutationFn: (args: Args) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['task-checklist', taskId] })
      // checklistDone/Total on cards
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })
}

export function useAddChecklistItem(taskId: string) {
  return useChecklistMutation(taskId, async (title: string) =>
    api.post(`/tasks/${taskId}/checklist`, { title }),
  )
}

export function useUpdateChecklistItem(taskId: string) {
  return useChecklistMutation(
    taskId,
    async ({ itemId, ...body }: { itemId: string; title?: string; done?: boolean; position?: number }) =>
      api.patch(`/checklist-items/${itemId}`, body),
  )
}

export function useDeleteChecklistItem(taskId: string) {
  return useChecklistMutation(taskId, async (itemId: string) => api.delete(`/checklist-items/${itemId}`))
}

export function useSetTaskBlocked() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ taskId, blocked, reason }: { taskId: string; blocked: boolean; reason?: string }) =>
      (await api.patch<TaskDetails>(`/tasks/${taskId}/blocked`, { blocked, reason: reason || undefined })).data,
    onSuccess: (_data, { taskId }) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      void queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
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
