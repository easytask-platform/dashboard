import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { PageResponse } from '@/lib/api/types'
import type { Member } from '@/features/teams/api'

export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export const PROJECT_STATUSES: ProjectStatus[] = ['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  startDate: string | null
  dueDate: string | null
  progressPercent: number
  memberCount: number
}

export interface TaskSummary {
  toDo: number
  inProgress: number
  inReview: number
  approved: number
  reopened: number
  cancelled: number
}

export interface ProjectDetails extends Project {
  taskSummary: TaskSummary
}

export interface ProjectFilters {
  search: string
  status: string
  page: number
}

export function useProjectsQuery(filters: ProjectFilters) {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, size: 20 }
      if (filters.search) params.search = filters.search
      if (filters.status) params.status = filters.status
      return (await api.get<PageResponse<Project>>('/projects', { params })).data
    },
  })
}

export function useProjectQuery(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => (await api.get<ProjectDetails>(`/projects/${projectId}`)).data,
  })
}

interface ProjectBody {
  name: string
  description: string
  status: ProjectStatus
  startDate: string | null
  dueDate: string | null
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: ProjectBody) => (await api.post<Project>('/projects', body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, ...body }: ProjectBody & { projectId: string }) =>
      (await api.patch<Project>(`/projects/${projectId}`, body)).data,
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

/**
 * Project report export (P4-12/D40, AF-10). Fetched as an authenticated blob;
 * PDF triggers a file download, HTML opens in a new tab.
 */
export async function downloadProjectReport(projectId: string, projectName: string, format: 'pdf' | 'html') {
  const { data } = await api.get<Blob>(`/projects/${projectId}/report`, {
    params: { format },
    responseType: 'blob',
  })
  const url = URL.createObjectURL(data)
  if (format === 'html') {
    window.open(url, '_blank', 'noopener')
  } else {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${projectName.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'project'}-report.pdf`
    anchor.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function useProjectMembersQuery(projectId: string) {
  return useQuery({
    queryKey: ['project-members', projectId],
    enabled: !!projectId,
    queryFn: async () => (await api.get<{ items: Member[] }>(`/projects/${projectId}/members`)).data.items,
  })
}

export function useAddProjectMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) =>
      api.post(`/projects/${projectId}/members`, { userId }),
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: string; userId: string }) =>
      api.delete(`/projects/${projectId}/members/${userId}`),
    onSuccess: (_data, { projectId }) => {
      void queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
  })
}
