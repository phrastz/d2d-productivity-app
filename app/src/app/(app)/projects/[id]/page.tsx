'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectDetail } from '@/hooks/useProjectDetail'
import { useSubProjects } from '@/hooks/useSubProjects'
import TopNav from '@/components/layout/TopNav'
import ProjectProgress from '@/components/projects/ProjectProgress'
import SubProjectCard from '@/components/projects/SubProjectCard'
import { Loader2, Plus, ArrowLeft, Calendar, MoreVertical } from 'lucide-react'
import { format } from 'date-fns'
import { Task } from '@/types'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { project, loading, error } = useProjectDetail(projectId)
  const { createSubProject } = useSubProjects()
  
  const [showAddSubProject, setShowAddSubProject] = useState(false)
  const [newSubProjectName, setNewSubProjectName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateSubProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubProjectName.trim()) return

    setCreating(true)
    try {
      const result = await createSubProject(projectId, newSubProjectName.trim())
      
      if (result) {
        setNewSubProjectName('')
        setShowAddSubProject(false)
        console.log('✅ Sub-project created successfully!')
      }
    } catch (err: any) {
      console.error('❌ Failed to create sub-project:', err)
      
      // Show detailed error to user
      const errorMessage = err?.message || err?.hint || err?.details || JSON.stringify(err)
      alert(`Error creating sub-project:\n\n${errorMessage}\n\nCheck console for full details.`)
    } finally {
      setCreating(false)
    }
  }

  const handleAddTask = (subProjectId: string) => {
    // TODO: Implement add task dialog
    console.log('Add task to sub-project:', subProjectId)
  }

  const handleEditTask = (task: Task) => {
    // TODO: Implement edit task dialog
    console.log('Edit task:', task)
  }

  const handleAddDirectTask = () => {
    // TODO: Implement add direct task dialog
    console.log('Add direct task to project')
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <TopNav title="Project" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex flex-col">
        <TopNav title="Project" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-red-400 mb-2">Error loading project</p>
            <p className="text-xs text-muted-foreground">{error || 'Project not found'}</p>
            <button
              onClick={() => router.push('/projects')}
              className="mt-4 px-4 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-sm font-medium transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    )
  }

  const subProjects = project.sub_projects || []
  const directTasks = project.directTasks || []

  return (
    <div className="flex-1 flex flex-col">
      <TopNav title="Project Detail" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/projects')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>

        {/* Project Header */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold gradient-text mb-2">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              )}
            </div>
            <button className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Project Meta */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            {project.end_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Due: {format(new Date(project.end_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="px-2.5 py-1 rounded-lg bg-slate-800/50 text-[10px] font-semibold">
              {project.status.toUpperCase()}
            </div>
          </div>

          {/* Progress */}
          <ProjectProgress project={project} />
        </div>

        {/* Add Sub Project Button */}
        {!showAddSubProject ? (
          <button
            onClick={() => setShowAddSubProject(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 text-muted-foreground hover:text-violet-400 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Sub Project</span>
          </button>
        ) : (
          <form onSubmit={handleCreateSubProject} className="glass rounded-2xl p-4">
            <input
              type="text"
              value={newSubProjectName}
              onChange={(e) => setNewSubProjectName(e.target.value)}
              placeholder="Sub project name..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddSubProject(false)
                  setNewSubProjectName('')
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800/70 text-foreground font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newSubProjectName.trim() || creating}
                className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        )}

        {/* Sub Projects List */}
        <div className="space-y-4">
          {subProjects.map((subProject) => (
            <SubProjectCard
              key={subProject.id}
              subProject={subProject}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
            />
          ))}
        </div>

        {/* Direct Tasks Section */}
        {directTasks.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Direct Tasks</h3>
            <div className="space-y-2">
              {directTasks.map((task: Task) => (
                <div
                  key={task.id}
                  onClick={() => handleEditTask(task)}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    task.status === 'done'
                      ? 'bg-green-500 border-green-500'
                      : 'border-slate-600 bg-slate-800'
                  }`}>
                    {task.status === 'done' && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`flex-1 text-sm ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {task.title}
                  </span>
                </div>
              ))}
              <button
                onClick={handleAddDirectTask}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 text-muted-foreground hover:text-violet-400 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Direct Task</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
