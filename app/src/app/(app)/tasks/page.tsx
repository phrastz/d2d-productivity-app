'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskStatus } from '@/types'
import KanbanBoard from '@/components/tasks/KanbanBoard'
import TaskDialog from '@/components/tasks/TaskDialog'
import TopNav from '@/components/layout/TopNav'
import { Plus, Filter } from 'lucide-react'

import { useRealtimeTasks } from '@/hooks/useRealtimeTasks'

export default function TasksPage() {
  const { tasks, loading, setTasks } = useRealtimeTasks()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('todo')

  const openCreate = (status: TaskStatus = 'todo') => {
    setEditingTask(null)
    setDefaultStatus(status)
    setDialogOpen(true)
  }

  const openEdit = (task: Task) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const handleSaved = (saved: Task) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  const handleDeleted = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  if (loading) {
    return (
      <div className="bg-slate-950 min-h-screen">
        <TopNav title="Tasks" subtitle="Kanban board view" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-950 min-h-screen">
      <TopNav title="Tasks" subtitle="Drag tasks between columns to update status" />
      <div className="p-6 space-y-5 animate-fade-in">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass bg-slate-900/90 border border-slate-800 text-sm text-slate-300 hover:text-white transition-all">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <div className="ml-auto text-xs text-slate-400">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
          </div>
        </div>

        {/* Kanban Board */}
        <KanbanBoard
          initialTasks={tasks}
          onTaskClick={openEdit}
          onAddTask={openCreate}
        />
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <TaskDialog
          task={editingTask}
          defaultStatus={defaultStatus}
          onClose={() => setDialogOpen(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
