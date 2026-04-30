'use client'

import { Project, SubProject } from '@/types'

interface ProjectProgressProps {
  project: Project & { sub_projects?: SubProject[]; directTasks?: any[] }
}

export default function ProjectProgress({ project }: ProjectProgressProps) {
  const overallProgress = project.progress || 0
  const subProjects = project.sub_projects || []
  const directTasks = project.directTasks || []
  const directTasksTotal = directTasks.length
  const directTasksDone = directTasks.filter(t => t.status === 'done').length

  const getProgressColor = (progress: number): string => {
    if (progress >= 71) return 'bg-green-500'
    if (progress >= 31) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getProgressTextColor = (progress: number): string => {
    if (progress >= 71) return 'text-green-400'
    if (progress >= 31) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-100">Overall Progress</h3>
          <span className={`text-2xl font-bold ${getProgressTextColor(overallProgress)}`}>
            {overallProgress}%
          </span>
        </div>
        <div className="h-3 bg-slate-800/50 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getProgressColor(overallProgress)}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div className="mt-1.5 text-xs text-slate-400">
          {project.tasks_done || 0} of {project.tasks_total || 0} tasks completed
        </div>
      </div>

      {/* Sub Projects Breakdown */}
      {subProjects.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Sub Projects
          </h4>
          {subProjects.map((sp) => {
            const progress = sp.progress || 0
            return (
              <div key={sp.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-100 truncate">
                      {sp.name}
                    </span>
                    <span className={`text-xs font-bold ${getProgressTextColor(progress)}`}>
                      {progress}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getProgressColor(progress)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {sp.tasks_done || 0}/{sp.tasks_total || 0} tasks
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Direct Tasks */}
      {directTasksTotal > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Direct Tasks
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-100">
                  Tasks not in any sub-project
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {directTasksDone}/{directTasksTotal}
                </span>
              </div>
              <div className="h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${directTasksTotal > 0 ? (directTasksDone / directTasksTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
