'use client'

import { Task } from '@/types'
import { calculateProjectMetrics, formatMetric, getOnTimeColor, getEfficiencyColor, getBackdateWarning } from '@/lib/advancedMetrics'
import { cn } from '@/lib/utils'
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  TrendingUp,
  Target
} from 'lucide-react'

interface ProjectMetricsCardProps {
  tasks: Task[]
  className?: string
}

export function ProjectMetricsCard({ tasks, className }: ProjectMetricsCardProps) {
  const metrics = calculateProjectMetrics(tasks)
  const backdateWarning = getBackdateWarning(metrics.backdateRate)

  return (
    <div className={cn(
      "space-y-4 p-4 rounded-xl border bg-white dark:bg-slate-900/50",
      "border-slate-200 dark:border-slate-800",
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-violet-500" />
        <h3 className="font-semibold text-slate-900 dark:text-white">Project Health Metrics</h3>
      </div>
      
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Completion Rate */}
        <MetricItem
          icon={<CheckCircle2 className="w-4 h-4" />}
          label="Completion Rate"
          value={`${formatMetric(metrics.completionRate, '%', 0)}`}
          subValue={`${metrics.completedTasks}/${metrics.totalTasks} tasks`}
          colorClass={metrics.completionRate >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
        />
        
        {/* On-Time Delivery */}
        <MetricItem
          icon={<Clock className="w-4 h-4" />}
          label="On-Time Rate"
          value={`${formatMetric(metrics.onTimeRate, '%', 0)}`}
          subValue={`${metrics.onTimeDeliveries} on time, ${metrics.lateDeliveries} late`}
          colorClass={getOnTimeColor(metrics.onTimeRate)}
        />
        
        {/* Efficiency */}
        <MetricItem
          icon={<TrendingUp className="w-4 h-4" />}
          label="Effort Efficiency"
          value={`${formatMetric(metrics.efficiencyRate, '%', 0)}`}
          subValue={`Est: ${metrics.totalEstimatedEffort}, Act: ${metrics.totalActualEffort}`}
          colorClass={getEfficiencyColor(metrics.efficiencyRate)}
        />
        
        {/* Blocked Tasks */}
        <MetricItem
          icon={<ShieldAlert className="w-4 h-4" />}
          label="Blocked Tasks"
          value={`${metrics.blockedTasks}`}
          subValue={`${formatMetric(metrics.blockerImpactRate, '%', 0)} impact`}
          colorClass={metrics.blockedTasks === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
        />
      </div>

      {/* Velocity */}
      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">Velocity (last 30 days)</span>
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {metrics.velocity.toFixed(2)} tasks/day
          </span>
        </div>
      </div>

      {/* Warnings */}
      {metrics.backdateRate > 10 && (
        <div className={cn(
          "text-xs p-2.5 rounded-lg flex items-start gap-2",
          backdateWarning.level === 'high' 
            ? "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20" :
          backdateWarning.level === 'medium'
            ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
            : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
        )}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">{metrics.backdatedEntries} backdated entries ({formatMetric(metrics.backdateRate, '%', 0)})</div>
            <div className="opacity-80">{backdateWarning.message}</div>
          </div>
        </div>
      )}

      {/* Time Variance (if data available) */}
      {metrics.avgTimeVariance !== 0 && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Avg Time Variance</span>
            <span className={cn(
              "text-sm font-medium",
              metrics.avgTimeVariance <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            )}>
              {metrics.avgTimeVariance > 0 ? '+' : ''}{metrics.avgTimeVariance.toFixed(1)} days
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">
            Negative = early, Positive = late
          </div>
        </div>
      )}
    </div>
  )
}

interface MetricItemProps {
  icon: React.ReactNode
  label: string
  value: string
  subValue: string
  colorClass: string
}

function MetricItem({ icon, label, value, subValue, colorClass }: MetricItemProps) {
  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wide font-medium">{label}</span>
      </div>
      <div className={cn("text-xl font-bold", colorClass)}>{value}</div>
      <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">{subValue}</div>
    </div>
  )
}

export default ProjectMetricsCard
