import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

/**
 * Saved filters (P4-8/D42, AF-13/14). Server-side per user so they follow the
 * user across dashboard and phone. `filters` is an opaque JSON object of
 * string values — the server only validates name/size; each client applies
 * the keys it understands and ignores the rest.
 */
export interface SavedFilter {
  id: string
  name: string
  filters: Record<string, string>
  createdAt: string
}

export function useSavedFiltersQuery() {
  return useQuery({
    queryKey: ['saved-filters'],
    queryFn: async () => (await api.get<{ items: SavedFilter[] }>('/me/saved-filters')).data.items,
  })
}

export function useCreateSavedFilter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; filters: Record<string, string> }) =>
      (await api.post<SavedFilter>('/me/saved-filters', body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-filters'] }),
  })
}

export function useDeleteSavedFilter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (filterId: string) => api.delete(`/me/saved-filters/${filterId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-filters'] }),
  })
}
