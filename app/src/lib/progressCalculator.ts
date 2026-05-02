import type { Task, SubProject } from '@/types'

/**
 * Calculate sub-project progress from its nested tasks
 * = simple average of all task progress_percent
 */
export function calculateSubProjectProgress(tasks: Task[]): number {
  if (!tasks || tasks.length === 0) return 0
  const sum = tasks.reduce((total, t) => total + (t.progress_percent || 0), 0)
  return Math.round(sum / tasks.length)
}

/**
 * Calculate project progress from sub-projects + direct tasks
 * Weighted average for sub-projects, simple average for direct tasks
 */
export function calculateProjectProgress(
  subProjects: SubProject[],
  directTasks: Task[]
): number {
  const totalItems = subProjects.length + directTasks.length
  if (totalItems === 0) return 0

  let subContribution = 0
  if (subProjects.length > 0) {
    const totalWeight = subProjects.reduce(
      (sum, sp) => sum + (sp.weight_contribution || 1), 0
    )
    const weightedProgress = subProjects.reduce(
      (sum, sp) => sum + ((sp.progress_percent || 0) * (sp.weight_contribution || 1)), 0
    )
    const avgSubProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0
    subContribution = avgSubProgress * (subProjects.length / totalItems)
  }

  let directContribution = 0
  if (directTasks.length > 0) {
    const avgDirect = directTasks.reduce(
      (sum, t) => sum + (t.progress_percent || 0), 0
    ) / directTasks.length
    directContribution = avgDirect * (directTasks.length / totalItems)
  }

  return Math.min(100, Math.max(0, Math.round(subContribution + directContribution)))
}

/**
 * Sync task status from progress_percent
 */
export function syncTaskStatus(
  progress: number
): 'todo' | 'in_progress' | 'done' {
  if (progress === 0) return 'todo'
  if (progress === 100) return 'done'
  return 'in_progress'
}

/**
 * Sync progress_percent from task status
 */
export function syncProgressFromStatus(
  status: 'todo' | 'in_progress' | 'done'
): number {
  if (status === 'todo') return 0
  if (status === 'done') return 100
  return 50
}
