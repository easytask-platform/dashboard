import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { TaskListItem } from '@/features/tasks/api'

/**
 * Daily focus board (P4-7/D33, FR-29): a personal pin list, invisible to
 * others and with zero effect on the task lifecycle. Capped at 20 pins
 * server-side (409 beyond).
 */
export function useFocusQuery() {
  return useQuery({
    queryKey: ['focus'],
    queryFn: async () => (await api.get<{ items: TaskListItem[] }>('/me/focus')).data.items,
  })
}

function useFocusMutation(mutationFn: (taskId: string) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (_data, taskId) => {
      void queryClient.invalidateQueries({ queryKey: ['focus'] })
      // `pinned` flag on task payloads
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['task', taskId] })
    },
  })
}

export function usePinTask() {
  return useFocusMutation(async (taskId) => api.post(`/me/focus/${taskId}`))
}

export function useUnpinTask() {
  return useFocusMutation(async (taskId) => api.delete(`/me/focus/${taskId}`))
}
