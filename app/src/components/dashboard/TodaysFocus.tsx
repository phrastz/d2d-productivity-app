'use client'

import { useState } from 'react'
import { Task } from '@/types'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Clock, AlertCircle, Flag } from 'lucide-react'
import { format, isToday, parseISO } from 'date-fns'

const priorityConfig = {
  low:    { color: 'text-emerald-400', icon: Flag },
  medium: { color: 'text-amber-400',   icon: Flag },
  high:   { color: 'text-orange-400',  icon: Flag },
  urgent: { color: 'text-red-400',     icon: AlertCircle },
}

interface TodaysFocusProps {
  tasks: Task[]
  onToggle: (id: string, current: Task['status']) => Promise<void>
}

export default function TodaysFocus({ tasks, onToggle }: TodaysFocusProps) {
  const [toggling, setToggling] = useState<string | null>(null)

  const todayTasks = tasks.filter(t => {
    if (!t.due_date) return false
    return isToday(parseISO(t.due_date))
  })

  const completed = todayTasks.filter(t => t.status === 'done').length
  const pct = todayTasks.length > 0 ? Math.round((completed / todayTasks.length) * 100) : 0

  const handleToggle = async (task: Task) => {
    setToggling(task.id)
    const next = task.status === 'done' ? 'todo' : 'done'
    await onToggle(task.id, next as Task['status'])
    setToggling(null)
  }

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Today&apos;s Focus
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(new Date(), 'EEEE, d MMMM')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold gradient-text">{completed}/{todayTasks.length}</p>
          <p className="text-[10px] text-muted-foreground">completed</p>
        </div>
      </div>

      {/* Progress bar */}
      {todayTasks.length > 0 && (
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div className="progress-fill h-full" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {todayTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-sm text-muted-foreground">No tasks due today!</p>
            <p className="text-xs text-muted-foreground/60">Add tasks via the + button</p>
          </div>
        ) : (
          todayTasks.map(task => {
            const { color, icon: PriorityIcon } = priorityConfig[task.priority]
            const done = task.status === 'done'
            const loading = toggling === task.id

            return (
              <button
                key={task.id}
                onClick={() => handleToggle(task)}
                disabled={loading}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl text-left',
                  'transition-all duration-200 hover:bg-secondary/60',
                  done && 'opacity-60'
                )}
              >
                <span className={cn('flex-shrink-0 transition-transform', loading && 'scale-90')}>
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    : <Circle className="w-5 h-5 text-muted-foreground" />
                  }
                </span>
                <span className="flex-1 min-w-0">
                  <span className={cn(
                    'text-sm font-medium block truncate',
                    done ? 'line-through text-muted-foreground' : 'text-foreground'
                  )}>
                    {task.title}
                  </span>
                  {task.category && (
                    <span className="text-[10px] text-muted-foreground/70">{task.category}</span>
                  )}
                </span>
                <PriorityIcon className={cn('w-3.5 h-3.5 flex-shrink-0', color)} />
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
