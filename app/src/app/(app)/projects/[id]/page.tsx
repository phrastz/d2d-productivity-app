'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useProjectDetail } from '@/hooks/useProjectDetail'
import { useSubProjects } from '@/hooks/useSubProjects'
import TopNav from '@/components/layout/TopNav'
import ProjectProgress from '@/components/projects/ProjectProgress'
import ProjectActions from '@/components/projects/ProjectActions'
import SubProjectCard from '@/components/projects/SubProjectCard'
import { Loader2, Plus, ArrowLeft, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { Task } from '@/types'
import AddTaskForm from '@/components/projects/AddTaskForm'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { project, loading, error, updateTaskProgress, updateTaskStatus } = useProjectDetail(projectId)
  const { createSubProject } = useSubProjects()
  
  const [showAddSubProject, setShowAddSubProject] = useState(false)
  const [newSubProjectName, setNewSubProjectName] = useState('')
  const [newSubProjectStartDate, setNewSubProjectStartDate] = useState('')
  const [newSubProjectEndDate, setNewSubProjectEndDate] = useState('')
  const [creating, setCreating] = useState(false)
  const [showAddDirectTask, setShowAddDirectTask] = useState(false)

  const handleCreateSubProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubProjectName.trim()) return

    // Validate: end date must not be before start date
    if (newSubProjectStartDate && newSubProjectEndDate && newSubProjectEndDate < newSubProjectStartDate) {
      alert('End Date tidak boleh lebih kecil dari Start Date.')
      return
    }

    setCreating(true)
    try {
      const result = await createSubProject(
        projectId,
        newSubProjectName.trim(),
        undefined,
        'medium',
        newSubProjectStartDate || null,
        newSubProjectEndDate || null,
      )
      
      if (result) {
        setNewSubProjectName('')
        setNewSubProjectStartDate('')
        setNewSubProjectEndDate('')
        setShowAddSubProject(false)
        console.log('✅ Sub-project created successfully!')
      }
    } catch (err: any) {
      console.error('❌ Failed to create sub-project:', err)
      const errorMessage = err?.message || err?.hint || err?.details || JSON.stringify(err)
      alert(`Error creating sub-project:\n\n${errorMessage}\n\nCheck console for full details.`)
    } finally {
      setCreating(false)
    }
  }

  // Nested task: handled inside SubProjectCard directly
  const handleAddTask = (_subProjectId: string) => {}

  const handleEditTask = (task: Task) => {
    // TODO: Implement edit task dialog
    console.log('Edit task:', task)
  }

  const handleAddDirectTask = () => {
    setShowAddDirectTask(true)
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <TopNav title="Project" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading project...</p>
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
            <p className="text-xs text-slate-400">{error || 'Project not found'}</p>
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
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-100 transition-colors"
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
                <p className="text-sm text-slate-400">{project.description}</p>
              )}
            </div>
            <ProjectActions 
              projectId={project.id} 
              currentName={project.name} 
              currentDescription={project.description}
              onUpdated={() => router.refresh()}
            />
          </div>

          {/* Project Meta */}
          <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
            {project.end_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Due: {format(new Date(project.end_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="px-2.5 py-1 rounded-lg bg-slate-800/50 text-slate-200 text-[10px] font-semibold">
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
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 text-slate-400 hover:text-violet-400 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Sub Project</span>
          </button>
        ) : (
          <form onSubmit={handleCreateSubProject} className="glass rounded-2xl p-4 space-y-3">
            {/* Sub Project Name */}
            <input
              type="text"
              value={newSubProjectName}
              onChange={(e) => setNewSubProjectName(e.target.value)}
              placeholder="Sub project name..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              autoFocus
            />

            {/* Timeline Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Start Date</label>
                <input
                  type="date"
                  value={newSubProjectStartDate}
                  onChange={(e) => setNewSubProjectStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">
                  End Date
                  {newSubProjectStartDate && (
                    <span className="text-slate-500 ml-1">(min: {newSubProjectStartDate})</span>
                  )}
                </label>
                <input
                  type="date"
                  value={newSubProjectEndDate}
                  min={newSubProjectStartDate || undefined}
                  onChange={(e) => setNewSubProjectEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowAddSubProject(false)
                  setNewSubProjectName('')
                  setNewSubProjectStartDate('')
                  setNewSubProjectEndDate('')
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800/70 text-slate-100 font-medium transition-colors"
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
              updateTaskProgress={updateTaskProgress}
            />
          ))}
        </div>

        {/* Direct Tasks Section — always visible */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Direct Tasks</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">{directTasks.length} task{directTasks.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2">
            {directTasks.length === 0 && !showAddDirectTask && (
              <p className="text-center py-4 text-sm text-slate-500">No direct tasks yet.</p>
            )}
            {directTasks.map((task: Task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/30 hover:bg-slate-200 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    task.status === 'done'
                      ? 'bg-green-500 border-green-500'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                  }`}>
                    {task.status === 'done' && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span 
                    onClick={() => handleEditTask(task)}
                    className={`flex-1 text-sm cursor-pointer ${task.status === 'done' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-slate-100'}`}
                  >
                    {task.title}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                    {task.progress_percent || 0}%
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 mt-2">
                  <div 
                    className="bg-violet-500 h-1 rounded-full transition-all"
                    style={{ width: `${task.progress_percent || 0}%` }}
                  />
                </div>
                
                {/* Progress Preset Buttons */}
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateTaskProgress?.(task.id, 0)
                    }}
                    className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    0%
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateTaskProgress?.(task.id, 50)
                    }}
                    className="px-2 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                  >
                    50%
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateTaskProgress?.(task.id, 100)
                    }}
                    className="px-2 py-0.5 text-xs rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    100%
                  </button>
                </div>
              </div>
            ))}

            {/* Add Direct Task form or button */}
            {showAddDirectTask ? (
              <AddTaskForm
                projectId={projectId}
                subProjectId={null}
                onCreated={() => setShowAddDirectTask(false)}
                onCancel={() => setShowAddDirectTask(false)}
              />
            ) : (
              <button
                onClick={handleAddDirectTask}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 text-slate-400 hover:text-violet-400 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Direct Task</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
