'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'
import ProjectTimeline from '@/components/projects/ProjectTimeline'
import ProjectDialog from '@/components/projects/ProjectDialog'
import TopNav from '@/components/layout/TopNav'
import { Plus, LayoutList, GanttChart } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusColors = {
  active:    'bg-violet-500/20 text-violet-300 border-violet-500/30',
  completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  on_hold:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  archived:  'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

type ViewMode = 'list' | 'timeline'

export default function ProjectsPage() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('timeline')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
    setProjects(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleSaved = (p: Project) => {
    setProjects(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = p; return n }
      return [p, ...prev]
    })
  }

  const handleDeleted = (id: string) => setProjects(prev => prev.filter(p => p.id !== id))

  if (loading) {
    return (
      <>
        <TopNav title="Projects" subtitle="Gantt & list view" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title="Projects" subtitle="Plan and track your projects" />
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditing(null); setDialogOpen(true) }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>

          {/* View toggle */}
          <div className="flex items-center gap-1 glass border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setView('timeline')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'timeline' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <GanttChart className="w-3.5 h-3.5" />
              Timeline
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                view === 'list' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutList className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          <div className="ml-auto text-xs text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Timeline view */}
        {view === 'timeline' && <ProjectTimeline projects={projects} />}

        {/* List view */}
        {view === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => { setEditing(project); setDialogOpen(true) }}
                className="glass rounded-2xl p-5 text-left hover:glow transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
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
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                )}
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full progress-fill"
                    style={{ width: `${project.progress_percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{project.progress_percentage}%</span>
                  {project.end_date && (
                    <span className="text-[10px] text-muted-foreground">
                      Due {new Date(project.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </button>
            ))}
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
    </>
  )
}
