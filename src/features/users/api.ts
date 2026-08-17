import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { PageResponse } from '@/lib/api/types'

export interface User {
  id: string
  fullName: string
  email: string
  role: string
  roleId: string
  active: boolean
  createdAt: string
}

export interface UserFilters {
  search: string
  role: string
  active: string
  page: number
}

export function useUsersQuery(filters: UserFilters) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, size: 20 }
      if (filters.search) params.search = filters.search
      if (filters.role) params.role = filters.role
      if (filters.active) params.active = filters.active
      const { data } = await api.get<PageResponse<User>>('/users', { params })
      return data
    },
  })
}

interface CreateUserBody {
  fullName: string
  email: string
  /** Omitted = invitation mode: the user gets an email and sets their own (P3-2). */
  initialPassword?: string
  roleId: string
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateUserBody) => (await api.post<User>('/users', body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, ...body }: { userId: string; fullName: string; roleId: string }) =>
      (await api.patch<User>(`/users/${userId}`, body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => api.patch(`/users/${userId}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useAdminResetPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      api.patch(`/users/${userId}/password`, { newPassword }),
  })
}
