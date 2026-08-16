import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { PageResponse } from '@/lib/api/types'
import type { TaskSummary } from '@/features/projects/api'
import type { TaskStatus } from '@/features/tasks/api'

export interface OverdueTaskItem {
  id: string
  title: string
  projectName: string
  dueDate: string
  status: TaskStatus
}

export interface AdminDashboard {
  totalUsers: number
  activeUsers: number
  teamCount: number
  projectCount: number
  taskCount: number
  tasksByStatus: TaskSummary
  overdueTasks: OverdueTaskItem[]
}

export interface WorkloadItem {
  userId: string
  fullName: string
  assignedTaskCount: number
  inProgressTaskCount: number
  overdueTaskCount: number
  loggedHours: number
}

export interface ProjectProgressItem {
  projectId: string
  projectName: string
  progressPercent: number
  taskCount: number
  approvedTaskCount: number
  overdueTaskCount: number
  estimatedHours: number | null
  loggedHours: number
}

export interface ManagerDashboard {
  managedTaskCount: number
  tasksAwaitingReview: number
  overdueTaskCount: number
  tasksByStatus: TaskSummary
  memberWorkload: WorkloadItem[]
  projectProgress: ProjectProgressItem[]
}

export function useAdminDashboardQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: async () => (await api.get<AdminDashboard>('/dashboard/admin')).data,
    enabled,
  })
}

export function useManagerDashboardQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard-manager'],
    queryFn: async () => (await api.get<ManagerDashboard>('/dashboard/manager')).data,
    enabled,
  })
}

export interface ReportFilters {
  teamId?: string
  projectId?: string
  from?: string
  to?: string
  page: number
}

export function useWorkloadReportQuery(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-workload', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, size: 20 }
      for (const key of ['teamId', 'projectId', 'from', 'to'] as const) {
        if (filters[key]) params[key] = filters[key]
      }
      return (await api.get<PageResponse<WorkloadItem>>('/reports/workload', { params })).data
    },
  })
}

export function useProjectProgressReportQuery(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-project-progress', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, size: 20 }
      for (const key of ['projectId', 'from', 'to'] as const) {
        if (filters[key]) params[key] = filters[key]
      }
      return (await api.get<PageResponse<ProjectProgressItem>>('/reports/project-progress', { params })).data
    },
  })
}
