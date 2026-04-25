'use client'

import { Project } from '@/types'
import { FolderOpen, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const statusColors = {
  active:    'bg-violet-500/20 text-violet-300 border-violet-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  on_hold:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  archived:  'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const progressColors = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
]

interface ProjectProgressProps {
  projects: Project[]
}

export default function ProjectProgress({ projects }: ProjectProgressProps) {
  const active = projects.filter(p => p.status === 'active').slice(0, 4)

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          Project Progress
        </h2>
        <Link
          href="/projects"
          className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-4">
        {active.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📁</p>
            <p className="text-sm text-muted-foreground">No active projects</p>
          </div>
        ) : (
          active.map((project, i) => (
            <div key={project.id} className="group">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                    statusColors[project.status]
                  )}>
                    {project.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-medium text-foreground truncate">
                    {project.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-foreground ml-2 flex-shrink-0">
                  {project.progress_percentage}%
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', progressColors[i % progressColors.length])}
                  style={{ width: `${project.progress_percentage}%` }}
                />
              </div>
              {project.end_date && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Due {new Date(project.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
