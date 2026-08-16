import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type DataScope = 'ORGANIZATION' | 'MANAGED' | 'ASSIGNED'

export interface Role {
  id: string
  name: string
  dataScope: DataScope
  system: boolean
  permissions: string[]
  userCount: number
}

export interface Permission {
  code: string
  description: string
}

export function useRolesQuery() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await api.get<{ items: Role[] }>('/roles')).data.items,
  })
}

export function usePermissionsQuery(enabled = true) {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => (await api.get<{ items: Permission[] }>('/permissions')).data.items,
    enabled,
    staleTime: Infinity,
  })
}

interface RoleBody {
  name: string
  dataScope: DataScope
  permissions: string[]
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: RoleBody) => (await api.post<Role>('/roles', body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ roleId, ...body }: RoleBody & { roleId: string }) =>
      (await api.patch<Role>(`/roles/${roleId}`, body)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (roleId: string) => api.delete(`/roles/${roleId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

/** Groups the flat permission catalog by module prefix (`task:review` → `task`). */
export function groupPermissions(permissions: Permission[]): Map<string, Permission[]> {
  const groups = new Map<string, Permission[]>()
  for (const permission of permissions) {
    const module = permission.code.split(':')[0] ?? 'other'
    const bucket = groups.get(module) ?? []
    bucket.push(permission)
    groups.set(module, bucket)
  }
  return groups
}
