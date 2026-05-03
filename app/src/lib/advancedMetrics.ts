import { Task } from '@/types'
import { differenceInDays, parseISO, isValid } from 'date-fns'

export interface ProjectMetrics {
  // Completion Metrics
  totalTasks: number
  completedTasks: number
  completionRate: number // %
  
  // Time Metrics
  onTimeDeliveries: number
  lateDeliveries: number
  onTimeRate: number // %
  avgTimeVariance: number // days (negative = early, positive = late)
  
  // Efficiency Metrics
  totalEstimatedEffort: number
  totalActualEffort: number
  efficiencyRate: number // %
  
  // Backdate Audit
  backdatedEntries: number
  backdateRate: number // %
  
  // Blocker Impact
  blockedTasks: number
  blockerImpactRate: number // %
  
  // Velocity (tasks per day)
  velocity: number
}

/**
 * Calculate comprehensive project metrics from tasks
 */
export function calculateProjectMetrics(tasks: Task[]): ProjectMetrics {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  
  // On-Time Delivery (only for completed tasks with both dates)
  const tasksWithDates = tasks.filter(t => 
    t.status === 'done' && t.planned_completed_date && t.actual_completed_date
  )
  
  const onTimeDeliveries = tasksWithDates.filter(t => {
    const planned = parseISO(t.planned_completed_date!)
    const actual = parseISO(t.actual_completed_date!)
    return isValid(planned) && isValid(actual) && actual <= planned
  }).length
  
  const lateDeliveries = tasksWithDates.length - onTimeDeliveries
  
  // Time Variance
  const variances = tasksWithDates.map(t => {
    const planned = parseISO(t.planned_completed_date!)
    const actual = parseISO(t.actual_completed_date!)
    if (!isValid(planned) || !isValid(actual)) return 0
    return differenceInDays(actual, planned)
  })
  
  const avgTimeVariance = variances.length > 0
    ? variances.reduce((sum, v) => sum + v, 0) / variances.length
    : 0
  
  // Effort Metrics
  const totalEstimatedEffort = tasks.reduce((sum, t) => sum + (t.effort_estimate || 0), 0)
  const totalActualEffort = tasks.reduce((sum, t) => sum + (t.actual_effort || 0), 0)
  const efficiencyRate = totalActualEffort > 0
    ? (totalEstimatedEffort / totalActualEffort) * 100
    : 0
  
  // Backdate Audit
  const backdatedEntries = tasks.filter(t => t.is_backdated_entry).length
  
  // Blocker Impact
  const blockedTasks = tasks.filter(t => t.is_blocked).length
  
  // Velocity (completed tasks per day over the last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const recentlyCompleted = tasks.filter(t => {
    if (t.status !== 'done' || !t.actual_completed_date) return false
    const completed = parseISO(t.actual_completed_date)
    return isValid(completed) && completed >= thirtyDaysAgo
  }).length
  
  const velocity = recentlyCompleted / 30
  
  return {
    totalTasks,
    completedTasks,
    completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    
    onTimeDeliveries,
    lateDeliveries,
    onTimeRate: tasksWithDates.length > 0 ? (onTimeDeliveries / tasksWithDates.length) * 100 : 0,
    avgTimeVariance,
    
    totalEstimatedEffort,
    totalActualEffort,
    efficiencyRate,
    
    backdatedEntries,
    backdateRate: completedTasks > 0 ? (backdatedEntries / completedTasks) * 100 : 0,
    
    blockedTasks,
    blockerImpactRate: totalTasks > 0 ? (blockedTasks / totalTasks) * 100 : 0,
    
    velocity,
  }
}

/**
 * Format time variance for display
 * Positive = late, Negative = early, Zero = on time
 */
export function formatTimeVariance(days: number): string {
  if (days === 0) return 'On time'
  if (days < 0) return `${Math.abs(days).toFixed(1)} days early`
  return `${days.toFixed(1)} days late`
}

/**
 * Get color class for time variance
 */
export function getTimeVarianceColor(days: number): string {
  if (days <= 0) return 'text-emerald-600 dark:text-emerald-400'
  if (days <= 2) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Get color class for efficiency rate
 */
export function getEfficiencyColor(rate: number): string {
  if (rate >= 100) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 80) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Get color class for on-time rate
 */
export function getOnTimeColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Get label for backdate rate
 */
export function getBackdateWarning(rate: number): { level: 'low' | 'medium' | 'high'; message: string } {
  if (rate <= 10) {
    return { level: 'low', message: 'Backdate rate is healthy' }
  } else if (rate <= 25) {
    return { level: 'medium', message: 'Moderate backdate rate - review data entry practices' }
  } else {
    return { level: 'high', message: 'High backdate rate - significant data entry delays detected' }
  }
}

/**
 * Calculate task time variance (actual - planned)
 * Positive = late, Negative = early
 */
export function calculateTaskTimeVariance(task: Task): number | null {
  if (!task.planned_completed_date || !task.actual_completed_date) return null
  
  const planned = parseISO(task.planned_completed_date)
  const actual = parseISO(task.actual_completed_date)
  
  if (!isValid(planned) || !isValid(actual)) return null
  
  return differenceInDays(actual, planned)
}

/**
 * Check if a date would be considered a backdate
 */
export function isBackdatedDate(date: Date | string): boolean {
  const checkDate = typeof date === 'string' ? parseISO(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return isValid(checkDate) && checkDate < today
}

/**
 * Format metric value with unit
 */
export function formatMetric(value: number, unit?: string, decimals: number = 1): string {
  const formatted = value.toFixed(decimals)
  return unit ? `${formatted}${unit}` : formatted
}
