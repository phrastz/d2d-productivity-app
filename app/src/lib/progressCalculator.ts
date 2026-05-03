import type { Task, SubProject } from '@/types'

/**
 * PROGRESS CALCULATION SYSTEM
 *
 * Task Level:
 *   - Manually set: 0-100% via progress_percent field
 *   - Auto-calculated: status-based (todo=0%, in_progress=50%, done=100%)
 *
 * Sub-Project Level:
 *   - If ALL tasks have effort estimates:
 *     progress = (sum of actual_effort / sum of estimated_effort) × 100
 *   - Otherwise:
 *     progress = (completed_tasks / total_tasks) × 100
 *
 * Project Level:
 *   - Weighted average of sub-project progress
 *   - Weight = sub_project.weight_contribution
 */

/**
 * Calculate sub-project progress from its nested tasks
 *
 * Priority order:
 * 1. If all tasks have effort estimates: Use effort-based progress
 * 2. Otherwise: Use task completion count
 *
 * Note: Cancelled tasks are excluded from progress calculations
 */
export function calculateSubProjectProgress(tasks: Task[]): number {
  if (!tasks || tasks.length === 0) return 0

  // Filter out cancelled tasks from progress calculation
  const activeTasks = tasks.filter(t => t.status !== 'cancelled')
  if (activeTasks.length === 0) return 0

  // Check if all active tasks have effort estimates
  const allHaveEffort = activeTasks.every(t =>
    t.effort_estimate && t.effort_estimate > 0
  )

  if (allHaveEffort) {
    // Effort-based progress
    const totalEstimated = activeTasks.reduce((sum, t) =>
      sum + (t.effort_estimate || 0), 0
    )
    const totalActual = activeTasks.reduce((sum, t) =>
      sum + (t.actual_effort || 0), 0
    )
    return totalEstimated > 0
      ? Math.min(Math.round((totalActual / totalEstimated) * 100), 100)
      : 0
  } else {
    // Task completion-based progress
    const completedTasks = activeTasks.filter(t => t.status === 'done').length
    return Math.round((completedTasks / activeTasks.length) * 100)
  }
}

/**
 * Get active tasks (excluding cancelled)
 */
export function getActiveTasks(tasks: Task[]): Task[] {
  return tasks.filter(t => t.status !== 'cancelled')
}

/**
 * Get task counts excluding cancelled
 */
export function getTaskCounts(tasks: Task[]) {
  const active = getActiveTasks(tasks)
  const total = active.length
  const done = active.filter(t => t.status === 'done').length
  const inProgress = active.filter(t => t.status === 'in_progress').length
  const todo = active.filter(t => t.status === 'todo').length
  const cancelled = tasks.filter(t => t.status === 'cancelled').length

  return { total, done, inProgress, todo, cancelled }
}

/**
 * Check if all tasks in a list have effort estimates
 */
export function allTasksHaveEffort(tasks: Task[]): boolean {
  if (!tasks || tasks.length === 0) return false
  return tasks.every(t => t.effort_estimate && t.effort_estimate > 0)
}

/**
 * Get effort summary for tasks
 */
export function getEffortSummary(tasks: Task[]) {
  const totalEstimated = tasks.reduce((sum, t) => sum + (t.effort_estimate || 0), 0)
  const totalActual = tasks.reduce((sum, t) => sum + (t.actual_effort || 0), 0)
  const unit = tasks.find(t => t.effort_estimate && t.effort_estimate > 0)?.effort_unit || 'hours'
  const efficiency = totalEstimated > 0 && totalActual > 0
    ? Math.round((totalActual / totalEstimated) * 100)
    : 0

  return { totalEstimated, totalActual, unit, efficiency }
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
