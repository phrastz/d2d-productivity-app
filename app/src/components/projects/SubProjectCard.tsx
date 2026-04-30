'use client'

import { useState } from 'react'
import { SubProject, Task } from '@/types'
import { ChevronDown, ChevronRight, Plus, MoreVertical, Edit2, Trash2, GripVertical } from 'lucide-react'
import { useSubProjects } from '@/hooks/useSubProjects'
import { createClient } from '@/lib/supabase/client'
import AddTaskForm from '@/components/projects/AddTaskForm'

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

// ── Task progress preset config ────────────────────────────────────────────
const PROGRESS_PRESETS = [
  { label: 'Todo',        value: 0,   color: 'bg-slate-600 hover:bg-slate-500 text-slate-200' },
  { label: 'In Progress', value: 50,  color: 'bg-blue-600  hover:bg-blue-500  text-white' },
  { label: 'Done',        value: 100, color: 'bg-green-600 hover:bg-green-500 text-white' },
]
// ──────────────────────────────────────────────────────────────────────────

interface TaskProgressControlProps {
  task: Task
  onUpdated: () => void
}

function TaskProgressControl({ task, onUpdated }: TaskProgressControlProps) {
  const supabase = createClient()
  const [editing, setEditing] = useState(false)
  const [manualValue, setManualValue] = useState<string>(String(task.progress_percent ?? 0))
  const [saving, setSaving] = useState(false)

  const currentProgress = task.progress_percent ?? 0

  const updateProgress = async (newValue: number) => {
    const clamped = Math.min(100, Math.max(0, newValue))
    setSaving(true)
    // Derive status from progress_percent
    const newStatus: Task['status'] =
      clamped === 100 ? 'done' : clamped > 0 ? 'in_progress' : 'todo'

    await supabase
      .from('tasks')
      .update({ progress_percent: clamped, status: newStatus })
      .eq('id', task.id)

    setSaving(false)
    setEditing(false)
    onUpdated()
  }

  const handleManualSubmit = () => {
    const parsed = parseInt(manualValue, 10)
    if (!isNaN(parsed)) updateProgress(parsed)
    else setEditing(false)
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* 3 Preset Buttons */}
      {PROGRESS_PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => updateProgress(preset.value)}
          disabled={saving}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all disabled:opacity-50 ${
            currentProgress === preset.value
              ? preset.color + ' ring-1 ring-white/30'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          {preset.label}
        </button>
      ))}

      {/* Manual % Input */}
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            onBlur={handleManualSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleManualSubmit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-12 px-1 py-0.5 rounded bg-slate-800 border border-white/20 text-slate-100 text-xs text-center focus:outline-none focus:ring-1 focus:ring-violet-500"
            autoFocus
          />
          <span className="text-slate-400 text-[10px]">%</span>
        </div>
      ) : (
        <button
          onClick={() => { setManualValue(String(currentProgress)); setEditing(true) }}
          className="w-10 text-center text-xs font-bold text-violet-300 hover:text-violet-100 tabular-nums"
          title="Edit progress manually"
        >
          {currentProgress}%
        </button>
      )}
    </div>
  )
}

export default function SubProjectCard({ subProject, onAddTask, onEditTask }: SubProjectCardProps) {
  const [expanded, setExpanded] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(subProject.name)
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAddTask, setShowAddTask] = useState(false)
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

  // Trigger parent re-fetch via realtime (already subscribed in useProjectDetail)
  // Local refresh key is just for optimistic re-render cue
  const handleTaskProgressUpdated = () => setRefreshKey(k => k + 1)

  const progress = subProject.progress || 0
  const tasks = subProject.tasks || []
  const tasksTotal = subProject.tasks_total || 0
  const tasksDone = subProject.tasks_done || 0

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/5">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 bg-slate-800/30">
        {/* Drag Handle */}
        <button className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-100 transition-colors">
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-100 transition-colors"
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
            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            autoFocus
          />
        ) : (
          <h3 className="flex-1 font-semibold text-white">{subProject.name}</h3>
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
          <div className="text-xs text-slate-400">
            {tasksDone}/{tasksTotal} tasks
          </div>
          <div className="text-sm font-bold gradient-text">{progress}%</div>
        </div>

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-100 transition-colors"
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
                  className="w-full px-3 py-2 text-left text-sm text-slate-100 hover:bg-white/5 flex items-center gap-2"
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
        <div className="p-4 space-y-2" key={refreshKey}>
          {tasks.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              No tasks yet
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors group"
              >
                {/* Task Title — click to edit */}
                <span
                  onClick={() => onEditTask(task)}
                  className={`flex-1 text-sm cursor-pointer ${
                    task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-100'
                  }`}
                >
                  {task.title}
                </span>

                {task.priority === 'urgent' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold">
                    URGENT
                  </span>
                )}

                {/* ✅ Task Progress Control — 3 presets + manual input */}
                <TaskProgressControl
                  task={task}
                  onUpdated={handleTaskProgressUpdated}
                />
              </div>
            ))
          )}

          {/* Add Task Button / Form */}
          {showAddTask ? (
            <AddTaskForm
              projectId={subProject.project_id}
              subProjectId={subProject.id}
              onCreated={() => {
                setShowAddTask(false)
                handleTaskProgressUpdated()
              }}
              onCancel={() => setShowAddTask(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddTask(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 text-slate-400 hover:text-violet-400 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Task</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
