import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

/** Project-scoped colored tag (P4-3/D32). */
export interface Tag {
  id: string
  projectId: string
  name: string
  color: string
}

/** Shape embedded on task list/detail payloads. */
export interface TagSummary {
  id: string
  name: string
  color: string
}

export function useProjectTagsQuery(projectId: string) {
  return useQuery({
    queryKey: ['project-tags', projectId],
    enabled: !!projectId,
    queryFn: async () =>
      (await api.get<{ items: Tag[] }>(`/projects/${projectId}/tags`)).data.items,
  })
}

export function useCreateTag(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; color: string }) =>
      (await api.post<Tag>(`/projects/${projectId}/tags`, body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-tags', projectId] }),
  })
}

export function useUpdateTag(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ tagId, ...body }: { tagId: string; name?: string; color?: string }) =>
      (await api.patch<Tag>(`/tags/${tagId}`, body)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-tags', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTag(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tagId: string) => api.delete(`/tags/${tagId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-tags', projectId] })
      void queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
