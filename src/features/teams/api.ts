import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { PageResponse } from '@/lib/api/types'

export interface Team {
  id: string
  name: string
  description: string | null
  memberCount: number
}

export interface Member {
  id: string
  fullName: string
  email: string
  role: string
  avatarUrl: string | null
}

export function useTeamsQuery(filters: { search: string; page: number }) {
  return useQuery({
    queryKey: ['teams', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, size: 20 }
      if (filters.search) params.search = filters.search
      return (await api.get<PageResponse<Team>>('/teams', { params })).data
    },
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; description: string }) =>
      (await api.post<Team>('/teams', body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  })
}

export function useUpdateTeam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ teamId, ...body }: { teamId: string; name: string; description: string }) =>
      (await api.patch<Team>(`/teams/${teamId}`, body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  })
}

export function useTeamMembersQuery(teamId: string | null) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => (await api.get<{ items: Member[] }>(`/teams/${teamId}/members`)).data.items,
    enabled: teamId !== null,
  })
}

export function useAddTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) =>
      api.post(`/teams/${teamId}/members`, { userId }),
    onSuccess: (_data, { teamId }) => {
      void queryClient.invalidateQueries({ queryKey: ['team-members', teamId] })
      void queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) =>
      api.delete(`/teams/${teamId}/members/${userId}`),
    onSuccess: (_data, { teamId }) => {
      void queryClient.invalidateQueries({ queryKey: ['team-members', teamId] })
      void queryClient.invalidateQueries({ queryKey: ['teams'] })
    },
  })
}
