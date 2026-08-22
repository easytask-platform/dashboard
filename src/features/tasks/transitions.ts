import { TASK_STATUSES, type TaskStatus } from './api'

/**
 * Allowed status transitions for the current user, derived from permission
 * claims exactly like the backend enforces them (port of the Flutter app's
 * TaskStatusTransitions):
 * - task:manage  — full override: any status to any other (managers, admins)
 * - task:execute — work the task forward (assignee moves)
 * - task:review  — approve or reopen work in review
 * - task:cancel  — cancel anything not already approved/cancelled
 */
export function targetsFor(permissions: string[], status: TaskStatus): TaskStatus[] {
  // task:manage holders can move a task to any other status, in any direction.
  if (permissions.includes('task:manage')) {
    return TASK_STATUSES.filter((s) => s !== status)
  }

  const targets = new Set<TaskStatus>()

  if (permissions.includes('task:execute')) {
    if (status === 'TO_DO') targets.add('IN_PROGRESS')
    if (status === 'IN_PROGRESS') targets.add('IN_REVIEW')
    if (status === 'REOPENED') {
      targets.add('IN_PROGRESS')
      targets.add('IN_REVIEW')
    }
  }

  if (permissions.includes('task:review') && status === 'IN_REVIEW') {
    targets.add('APPROVED')
    targets.add('REOPENED')
  }

  if (permissions.includes('task:cancel') && status !== 'APPROVED' && status !== 'CANCELLED') {
    targets.add('CANCELLED')
  }

  return [...targets]
}
