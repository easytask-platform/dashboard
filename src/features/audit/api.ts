import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { PageResponse } from '@/lib/api/types'

/**
 * Security audit events (P4-11/D39, AF-08/09): persisted sensitive admin
 * actions + auth-critical events, admin-only (`audit:read`).
 */
export const AUDIT_EVENT_TYPES = [
  'ROLE_CHANGED',
  'USER_DEACTIVATED',
  'ADMIN_PASSWORD_RESET',
  'PASSWORD_RESET_COMPLETED',
  'REFRESH_TOKEN_REUSE',
] as const

interface AuditPerson {
  id: string
  fullName: string
  avatarUrl: string | null
}

export interface AuditEvent {
  id: string
  eventType: (typeof AUDIT_EVENT_TYPES)[number]
  actor: AuditPerson | null
  targetUser: AuditPerson | null
  detail: string | null
  createdAt: string
}

export interface AuditFilters {
  eventType: string
  actorId: string
  from: string
  to: string
  page: number
}

export function useAuditEventsQuery(filters: AuditFilters) {
  return useQuery({
    queryKey: ['audit-events', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, size: 20 }
      for (const key of ['eventType', 'actorId', 'from', 'to'] as const) {
        if (filters[key]) params[key] = filters[key]
      }
      return (await api.get<PageResponse<AuditEvent>>('/audit-events', { params })).data
    },
  })
}
