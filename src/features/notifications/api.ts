import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { PageResponse } from '@/lib/api/types'

export interface Notification {
  id: string
  title: string
  message: string
  relatedTaskId: string | null
  read: boolean
  createdAt: string
}

export function useNotificationsQuery(filters: { read: string; page: number }) {
  return useQuery({
    queryKey: ['notifications', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, size: 20 }
      if (filters.read) params.read = filters.read
      return (await api.get<PageResponse<Notification>>('/notifications', { params })).data
    },
  })
}

/** Polled unread badge — the "live" signal in the top bar. */
export function useUnreadCountQuery() {
  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => (await api.get<{ count: number }>('/notifications/unread-count')).data.count,
    refetchInterval: 30_000,
  })
}

export function useMarkRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => api.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })
}
