'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Task, TaskStatus } from '@/types'
import TaskCard from './TaskCard'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

const columnConfig: Record<TaskStatus, { label: string; color: string; bg: string; ring: string }> = {
  todo:        { label: 'To Do',       color: 'text-slate-300',   bg: 'bg-slate-500/10',   ring: 'border-slate-500/20' },
  in_progress: { label: 'In Progress', color: 'text-amber-300',   bg: 'bg-amber-500/10',   ring: 'border-amber-500/20' },
  done:        { label: 'Done',        color: 'text-emerald-300', bg: 'bg-emerald-500/10', ring: 'border-emerald-500/20' },
}

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
}

export default function KanbanColumn({ status, tasks, onTaskClick, onAddTask }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const { label, color, bg, ring } = columnConfig[status]

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-1 flex flex-col min-w-[280px] rounded-2xl border transition-colors glass bg-slate-100 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800',
        ring,
        isOver && 'bg-violet-500/10 border-violet-500/30'
      )}
    >
      {/* Column header */}
      <div className={cn('flex items-center justify-between px-4 py-3 rounded-t-2xl border-b border-slate-200 dark:border-slate-800/50', bg)}>
        <div className="flex items-center gap-2">
          <h3 className={cn('text-sm font-semibold', color)}>{label}</h3>
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
            bg, color, 'border', ring
          )}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="w-6 h-6 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[60vh] md:max-h-[calc(100vh-280px)]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-24 border-2 border-dashed border-slate-300 dark:border-slate-700/50 rounded-xl">
            <p className="text-xs text-slate-400 dark:text-slate-500">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  )
}
