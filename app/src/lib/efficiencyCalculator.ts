import type { Task, EfficiencyMetrics, ProjectEfficiency, SubProject } from '@/types'

/**
 * Calculate efficiency metrics for a single task
 * Returns null if no estimate provided
 */
export function calculateTaskEfficiency(
  estimate?: number,
  actual?: number
): EfficiencyMetrics | null {
  if (!estimate || estimate === 0) return null

  const actualEffort = actual || 0
  const efficiencyRatio = (actualEffort / estimate) * 100
  const variance = actualEffort - estimate

  let status: 'under' | 'on_track' | 'over'
  if (efficiencyRatio <= 90) status = 'under'
  else if (efficiencyRatio <= 110) status = 'on_track'
  else status = 'over'

  return {
    estimatedEffort: estimate,
    actualEffort,
    efficiencyRatio,
    variance,
    status
  }
}

/**
 * Calculate efficiency for multiple tasks
 * Used for sub-project and project level calculations
 */
export function calculateTasksEfficiency(tasks: Task[]): EfficiencyMetrics | null {
  const totalEstimate = tasks.reduce((sum, t) => sum + (t.effort_estimate || 0), 0)
  const totalActual = tasks.reduce((sum, t) => sum + (t.actual_effort || 0), 0)
  
  return calculateTaskEfficiency(totalEstimate, totalActual)
}

/**
 * Calculate project-wide efficiency metrics
 */
export function calculateProjectEfficiency(
  tasks: Task[],
  subProjects: SubProject[] = []
): ProjectEfficiency {
  // Calculate overall project efficiency
  const totalEstimate = tasks.reduce((sum, t) => sum + (t.effort_estimate || 0), 0)
  const totalActual = tasks.reduce((sum, t) => sum + (t.actual_effort || 0), 0)
  
  // Calculate per-sub-project efficiency
  const subProjectEfficiency = subProjects.map(sp => {
    const spTasks = tasks.filter(t => t.sub_project_id === sp.id)
    const spEstimate = spTasks.reduce((s, t) => s + (t.effort_estimate || 0), 0)
    const spActual = spTasks.reduce((s, t) => s + (t.actual_effort || 0), 0)
    
    return {
      id: sp.id,
      name: sp.name,
      ratio: spEstimate > 0 ? Math.round((spActual / spEstimate) * 100) : 0,
      estimate: spEstimate,
      actual: spActual
    }
  }).filter(sp => sp.estimate > 0)
  
  // Count tasks by efficiency status
  const onTrackTasks = tasks.filter(t => {
    if (!t.effort_estimate) return false
    const ratio = ((t.actual_effort || 0) / t.effort_estimate) * 100
    return ratio <= 110
  }).length
  
  const overEffortTasks = tasks.filter(t => {
    if (!t.effort_estimate) return false
    const ratio = ((t.actual_effort || 0) / t.effort_estimate) * 100
    return ratio > 110
  }).length
  
  return {
    totalEstimate,
    totalActual,
    overallRatio: totalEstimate > 0 ? Math.round((totalActual / totalEstimate) * 100) : 0,
    subProjectEfficiency,
    onTrackTasks,
    overEffortTasks
  }
}

/**
 * Get efficiency status color for UI
 */
export function getEfficiencyColor(ratio: number): string {
  if (ratio === 0) return 'text-slate-500'
  if (ratio <= 90) return 'text-green-600 dark:text-green-400'
  if (ratio <= 110) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Get efficiency status label
 */
export function getEfficiencyLabel(ratio: number): string {
  if (ratio === 0) return 'Not tracked'
  if (ratio <= 90) return 'Under budget'
  if (ratio <= 110) return 'On track'
  return 'Over budget'
}

/**
 * Get efficiency background color for badges
 */
export function getEfficiencyBgColor(ratio: number): string {
  if (ratio === 0) return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
  if (ratio <= 90) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
  if (ratio <= 110) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
}

/**
 * Format effort with unit
 */
export function formatEffort(value: number, unit: string): string {
  if (value === 0) return '-'
  const unitLabel = unit === 'story_points' ? 'pts' : unit === 'days' ? 'd' : 'h'
  return `${value}${unitLabel}`
}

/**
 * Calculate remaining effort estimate
 */
export function calculateRemainingEffort(tasks: Task[]): number {
  return tasks.reduce((sum, t) => {
    const estimate = t.effort_estimate || 0
    const actual = t.actual_effort || 0
    const remaining = Math.max(0, estimate - actual)
    return sum + remaining
  }, 0)
}

/**
 * Get projected completion based on velocity
 */
export function calculateVelocity(
  completedTasks: Task[],
  daysWindow: number = 7
): number {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysWindow)
  
  const recentCompleted = completedTasks.filter(t => {
    if (!t.updated_at) return false
    const taskDate = new Date(t.updated_at)
    return taskDate >= cutoffDate && t.status === 'done'
  })
  
  const effortSum = recentCompleted.reduce((sum, t) => sum + (t.actual_effort || 0), 0)
  
  return recentCompleted.length > 0 ? effortSum / daysWindow : 0
}
