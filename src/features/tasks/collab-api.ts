import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

interface Person {
  id: string
  fullName: string
}

export interface TaskComment {
  id: string
  taskId: string
  author: Person
  text: string
  createdAt: string
  updatedAt: string
}

export interface TaskAttachment {
  id: string
  taskId: string
  originalFilename: string
  contentType: string
  fileSize: number
  uploader: Person
  uploadedAt: string
}

export interface TimeEntry {
  id: string
  taskId: string
  employee: Person
  workDate: string
  hoursSpent: number
  note: string | null
  createdAt: string
}

export interface TimeEntriesResponse {
  items: TimeEntry[]
  totalLoggedHours: number
  estimatedHours: number | null
}

export interface ActivityEvent {
  id: string
  taskId: string
  actor: Person
  eventType: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

const invalidateTask = (queryClient: ReturnType<typeof useQueryClient>, taskId: string, key: string) => {
  void queryClient.invalidateQueries({ queryKey: [key, taskId] })
  void queryClient.invalidateQueries({ queryKey: ['task-activity', taskId] })
}

export function useCommentsQuery(taskId: string) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => (await api.get<{ items: TaskComment[] }>(`/tasks/${taskId}/comments`)).data.items,
  })
}

export function useAddComment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (text: string) => api.post(`/tasks/${taskId}/comments`, { text }),
    onSuccess: () => invalidateTask(queryClient, taskId, 'task-comments'),
  })
}

export function useUpdateComment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId, text }: { commentId: string; text: string }) =>
      api.patch(`/comments/${commentId}`, { text }),
    onSuccess: () => invalidateTask(queryClient, taskId, 'task-comments'),
  })
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) => api.delete(`/comments/${commentId}`),
    onSuccess: () => invalidateTask(queryClient, taskId, 'task-comments'),
  })
}

export function useAttachmentsQuery(taskId: string) {
  return useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => (await api.get<{ items: TaskAttachment[] }>(`/tasks/${taskId}/attachments`)).data.items,
  })
}

export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file, file.name)
      return api.post(`/tasks/${taskId}/attachments`, formData)
    },
    onSuccess: () => invalidateTask(queryClient, taskId, 'task-attachments'),
  })
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (attachmentId: string) => api.delete(`/attachments/${attachmentId}`),
    onSuccess: () => invalidateTask(queryClient, taskId, 'task-attachments'),
  })
}

/** Fetches with auth and triggers a browser download. */
export async function downloadAttachment(attachment: TaskAttachment) {
  const { data } = await api.get<Blob>(`/attachments/${attachment.id}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = attachment.originalFilename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function useTimeEntriesQuery(taskId: string) {
  return useQuery({
    queryKey: ['task-time', taskId],
    queryFn: async () => (await api.get<TimeEntriesResponse>(`/tasks/${taskId}/time-entries`)).data,
  })
}

interface TimeEntryBody {
  workDate: string
  hoursSpent: number
  note: string
}

export function useAddTimeEntry(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: TimeEntryBody) => api.post(`/tasks/${taskId}/time-entries`, body),
    onSuccess: () => {
      invalidateTask(queryClient, taskId, 'task-time')
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })
}

export function useDeleteTimeEntry(taskId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (timeEntryId: string) => api.delete(`/time-entries/${timeEntryId}`),
    onSuccess: () => {
      invalidateTask(queryClient, taskId, 'task-time')
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })
}

export function useActivityQuery(taskId: string) {
  return useQuery({
    queryKey: ['task-activity', taskId],
    queryFn: async () => (await api.get<{ items: ActivityEvent[] }>(`/tasks/${taskId}/activity`)).data.items,
  })
}
