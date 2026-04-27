'use client'

import { useState } from 'react'
import { SubProject, Task } from '@/types'
import { ChevronDown, ChevronRight, Plus, MoreVertical, Edit2, Trash2, GripVertical } from 'lucide-react'
import { useSubProjects } from '@/hooks/useSubProjects'

interface SubProjectCardProps {
  subProject: SubProject
  onAddTask: (subProjectId: string) => void
  onEditTask: (task: Task) => void
}

const STATUS_COLORS = {
  not_started: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  on_hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const PRIORITY_COLORS = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-orange-500/20 text-orange-400',
}

export default function SubProjectCard({ subProject, onAddTask, onEditTask }: SubProjectCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(subProject.name)
  const { updateSubProject, deleteSubProject } = useSubProjects()

  const handleSaveEdit = async () => {
    if (editName.trim() && editName !== subProject.name) {
      await updateSubProject(subProject.id, { name: editName.trim() })
    }
    setEditing(false)
  }

  const handleDelete = async () => {
    if (confirm(`Delete sub-project "${subProject.name}"? All tasks will be moved to the main project.`)) {
      await deleteSubProject(subProject.id)
    }
  }

  const progress = subProject.progress || 0
  const tasks = subProject.tasks || []
  const tasksTotal = subProject.tasks_total || 0
  const tasksDone = subProject.tasks_done || 0

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/5">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 bg-slate-800/30">
        {/* Drag Handle */}
        <button className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        {/* Name */}
        {editing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') {
                setEditName(subProject.name)
                setEditing(false)
              }
            }}
            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10 text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            autoFocus
          />
        ) : (
          <h3 className="flex-1 font-semibold text-foreground">{subProject.name}</h3>
        )}

        {/* Status Badge */}
        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${STATUS_COLORS[subProject.status]}`}>
          {subProject.status.replace('_', ' ').toUpperCase()}
        </div>

        {/* Priority Badge */}
        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${PRIORITY_COLORS[subProject.priority]}`}>
          {subProject.priority.toUpperCase()}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            {tasksDone}/{tasksTotal} tasks
          </div>
          <div className="text-sm font-bold gradient-text">{progress}%</div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 glass rounded-xl border border-white/10 shadow-xl py-1 min-w-[140px]">
                <button
                  onClick={() => {
                    setEditing(true)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-white/5 flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleDelete()
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 bg-slate-800/50">
        <div
          className={`h-full transition-all duration-300 ${
            progress >= 71 ? 'bg-green-500' : progress >= 31 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Tasks List */}
      {expanded && (
        <div className="p-4 space-y-2">
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No tasks yet
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onEditTask(task)}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 cursor-pointer transition-colors group"
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
                {task.priority === 'urgent' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold">
                    URGENT
                  </span>
                )}
              </div>
            ))
          )}

          {/* Add Task Button */}
          <button
            onClick={() => onAddTask(subProject.id)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 text-muted-foreground hover:text-violet-400 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Task</span>
          </button>
        </div>
      )}
    </div>
  )
}
