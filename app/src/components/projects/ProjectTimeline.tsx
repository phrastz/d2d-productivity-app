'use client'

import { Project } from '@/types'
import { differenceInDays, parseISO, format, startOfDay, addDays } from 'date-fns'
import { cn } from '@/lib/utils'

const statusColors = {
  active:    { bar: 'bg-gradient-to-r from-violet-500 to-purple-600', badge: 'bg-violet-500/20 text-violet-700 dark:text-violet-300' },
  completed: { bar: 'bg-gradient-to-r from-emerald-500 to-teal-500', badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' },
  on_hold:   { bar: 'bg-gradient-to-r from-amber-500 to-orange-500', badge: 'bg-amber-500/20 text-amber-700 dark:text-amber-300' },
  archived:  { bar: 'bg-gray-500',                                    badge: 'bg-gray-500/20 text-gray-700 dark:text-gray-400' },
}

interface ProjectTimelineProps {
  projects: Project[]
}

export default function ProjectTimeline({ projects }: ProjectTimelineProps) {
  const validProjects = projects.filter(p => p.start_date && p.end_date)
  if (validProjects.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <p className="text-4xl mb-3">📅</p>
        <p className="text-sm text-slate-600 dark:text-slate-200">No projects with date ranges yet.</p>
        <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Set start and end dates on your projects to see the timeline.</p>
      </div>
    )
  }

  // Compute timeline boundaries
  const allDates = validProjects.flatMap(p => [parseISO(p.start_date!), parseISO(p.end_date!)])
  const minDate  = startOfDay(new Date(Math.min(...allDates.map(d => d.getTime()))))
  const maxDate  = startOfDay(new Date(Math.max(...allDates.map(d => d.getTime()))))
  const totalDays = differenceInDays(maxDate, minDate) + 1
  const today = startOfDay(new Date())
  const todayOffset = differenceInDays(today, minDate)

  // Generate month labels
  const months: { label: string; left: number }[] = []
  let cursor = new Date(minDate)
  while (cursor <= maxDate) {
    months.push({
      label: format(cursor, 'MMM yyyy'),
      left: (differenceInDays(cursor, minDate) / totalDays) * 100,
    })
    cursor = addDays(cursor, 30)
  }

  return (
    <div className="glass rounded-2xl p-5 overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Month labels */}
        <div className="relative h-6 mb-2 ml-40">
          {months.map(({ label, left }, i) => (
            <span
              key={i}
              className="absolute text-[10px] text-slate-500 dark:text-slate-200 -translate-x-1/2"
              style={{ left: `${left}%` }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {validProjects.map(project => {
            const start   = parseISO(project.start_date!)
            const end     = parseISO(project.end_date!)
            const startOff = (differenceInDays(start, minDate) / totalDays) * 100
            const widthPct = ((differenceInDays(end, start) + 1) / totalDays) * 100
            const colors   = statusColors[project.status]

            return (
              <div key={project.id} className="flex items-center gap-3 group">
                {/* Project label */}
                <div className="w-36 flex-shrink-0 text-right">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{project.name}</p>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full', colors.badge)}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Timeline bar */}
                <div className="flex-1 relative h-8 bg-secondary/40 rounded-full overflow-hidden">
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= totalDays && (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-primary/60 z-10"
                      style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                    />
                  )}

                  {/* Project bar */}
                  <div
                    className={cn('absolute top-1.5 bottom-1.5 rounded-full flex items-center px-2 transition-all', colors.bar)}
                    style={{ left: `${startOff}%`, width: `${widthPct}%` }}
                  >
                    <span className="text-[9px] font-bold text-white truncate">
                      {project.progress_percentage}%
                    </span>
                  </div>

                  {/* Progress fill */}
                  <div
                    className="absolute top-1.5 bottom-1.5 rounded-full bg-white/10"
                    style={{
                      left: `${startOff}%`,
                      width: `${(widthPct * project.progress_percentage) / 100}%`,
                    }}
                  />
                </div>

                {/* Dates */}
                <div className="w-24 flex-shrink-0 text-right hidden md:block">
                  <p className="text-[9px] text-slate-500 dark:text-slate-300">
                    {format(start, 'MMM d')} – {format(end, 'MMM d')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-300">
            <div className="w-0.5 h-3 bg-primary/60" />
            Today
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-300">
            Timeline from {format(minDate, 'MMM d')} to {format(maxDate, 'MMM d, yyyy')}
          </p>
        </div>
      </div>
    </div>
  )
}
