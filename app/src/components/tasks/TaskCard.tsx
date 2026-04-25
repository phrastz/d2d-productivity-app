'use client'

import { Task } from '@/types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Clock, Flag, AlertCircle, Calendar, Grip } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'

const priorityConfig = {
  low:    { color: 'text-emerald-400', bg: 'bg-emerald-400',   icon: Flag },
  medium: { color: 'text-amber-400',   bg: 'bg-amber-400',     icon: Flag },
  high:   { color: 'text-orange-400',  bg: 'bg-orange-400',    icon: Flag },
  urgent: { color: 'text-red-400',     bg: 'bg-red-400',       icon: AlertCircle },
}

interface TaskCardProps {
  task: Task
  onClick: (task: Task) => void
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const { color, bg, icon: PriorityIcon } = priorityConfig[task.priority]
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'task-card group select-none',
        isDragging && 'ring-2 ring-primary/50 scale-105',
        overdue && 'border-red-500/30'
      )}
      onClick={() => onClick(task)}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing"
          onClick={e => e.stopPropagation()}
        >
          <Grip className="w-3.5 h-3.5" />
        </button>

        {/* Priority dot */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('w-1.5 h-1.5 rounded-full', bg)} />
            <span className={cn('text-[10px] font-medium uppercase tracking-wide', color)}>
              {task.priority}
            </span>
            {task.category && (
              <span className="text-[10px] text-muted-foreground/60 ml-auto">
                {task.category}
              </span>
            )}
          </div>

          <p className={cn(
            'text-sm font-medium text-foreground leading-snug mb-2',
            task.status === 'done' && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </p>

          {task.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-1">
            {task.due_date && (
              <span className={cn(
                'flex items-center gap-1 text-[10px]',
                overdue ? 'text-red-400' : 'text-muted-foreground'
              )}>
                <Calendar className="w-3 h-3" />
                {format(parseISO(task.due_date), 'MMM d')}
              </span>
            )}
            {task.time_spent_minutes > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {task.time_spent_minutes}m
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
