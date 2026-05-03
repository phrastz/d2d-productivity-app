'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'
import ProjectTimeline from '@/components/projects/ProjectTimeline'
import ProjectDialog from '@/components/projects/ProjectDialog'
import QuickAddSubProject from '@/components/projects/QuickAddSubProject'
import TopNav from '@/components/layout/TopNav'
import { Plus, LayoutList, GanttChart, FolderTree, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

import { useRealtimeProjects } from '@/hooks/useRealtimeProjects'

const statusColors = {
  active:    'bg-violet-500/20 text-violet-300 border-violet-500/30 dark:text-violet-100',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 dark:text-emerald-100',
  on_hold:   'bg-amber-500/20 text-amber-300 border-amber-500/30 dark:text-amber-100',
  archived:  'bg-gray-500/20 text-gray-400 border-gray-500/30 dark:text-slate-200',
}

type ViewMode = 'list' | 'timeline'

export default function ProjectsPage() {
  const router = useRouter()
  const { projects, loading, setProjects, refetch } = useRealtimeProjects()
  const [view, setView] = useState<ViewMode>('timeline')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [projectStats, setProjectStats] = useState<Record<string, { subProjects: number; tasks: number }>>({})

  const handleSaved = (p: Project) => {
    setProjects(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = p; return n }
      return [p, ...prev]
    })
  }

  const handleDeleted = (id: string) => setProjects(prev => prev.filter(p => p.id !== id))

  // Handle sub-project created - refresh data
  const handleSubProjectCreated = () => {
    refetch()
    router.refresh()
  }

  // Fetch project stats (sub-projects and tasks count) - Optimized
  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()
      const stats: Record<string, { subProjects: number; tasks: number }> = {}

      // Batch fetch all stats in parallel with graceful fallback
      const statsPromises = projects.map(async (project) => {
        try {
          const [subProjectsResult, tasksResult] = await Promise.all([
            supabase
              .from('sub_projects')
              .select('id', { count: 'exact', head: true })
              .eq('project_id', project.id)
              .limit(1), // Optimization: just need count
            supabase
              .from('tasks')
              .select('id', { count: 'exact', head: true })
              .eq('project_id', project.id)
              .limit(1) // Optimization: just need count
          ])

          return {
            projectId: project.id,
            subProjects: subProjectsResult.count || 0,
            tasks: tasksResult.count || 0,
          }
        } catch (err) {
          console.warn(`Could not fetch stats for project ${project.id}:`, err)
          return {
            projectId: project.id,
            subProjects: 0,
            tasks: 0,
          }
        }
      })

      const results = await Promise.all(statsPromises)
      
      results.forEach(({ projectId, subProjects, tasks }) => {
        stats[projectId] = { subProjects, tasks }
      })

      setProjectStats(stats)
    }

    if (projects.length > 0) {
      fetchStats()
    }
  }, [projects])

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        <TopNav title="Projects" subtitle="Gantt & list view" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <TopNav title="Projects" subtitle="Plan and track your projects" />
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setEditing(null); setDialogOpen(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white dark:text-white text-sm font-semibold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
          <QuickAddSubProject onSuccess={handleSubProjectCreated} />

          {/* View toggle */}
          <div className="flex items-center gap-1 glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
            <button
              onClick={() => setView('timeline')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'timeline' ? 'bg-violet-600/20 text-violet-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <GanttChart className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'list' ? 'bg-violet-600/20 text-violet-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <div className="ml-auto text-xs text-slate-600 dark:text-slate-400">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Timeline view */}
        {view === 'timeline' && <ProjectTimeline projects={projects} />}

        {/* List view */}
        {view === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(project => {
              const stats = projectStats[project.id] || { subProjects: 0, tasks: 0 }
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 cursor-pointer hover:glow transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-violet-400 transition-colors">
                      {project.name}
                    </h3>
                    <span className={cn(
                      'text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ml-2',
                      statusColors[project.status]
                    )}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                  {project.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">{project.description}</p>
                  )}
                  
                  {/* Stats */}
                  <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-600 dark:text-slate-400">
                    {stats.subProjects > 0 && (
                      <div className="flex items-center gap-1">
                        <FolderTree className="w-3 h-3" />
                        <span>{stats.subProjects} sub-project{stats.subProjects > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <CheckSquare className="w-3 h-3" />
                      <span>{stats.tasks} task{stats.tasks !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full progress-fill"
                      style={{ width: `${project.progress_percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{project.progress_percentage}%</span>
                    {project.end_date && (
                      <span className="text-[10px] text-slate-600 dark:text-slate-400">
                        Due {new Date(project.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {dialogOpen && (
        <ProjectDialog
          project={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
