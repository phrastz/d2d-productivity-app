'use client'

import { useCallback, useState, useEffect } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Task, TaskStatus } from '@/types'
import KanbanColumn from './KanbanColumn'
import TaskCard from './TaskCard'
import { createClient } from '@/lib/supabase/client'

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'done']

interface KanbanBoardProps {
  initialTasks: Task[]
  onTaskClick: (task: Task) => void
  onAddTask: (status: TaskStatus) => void
}

export default function KanbanBoard({ initialTasks, onTaskClick, onAddTask }: KanbanBoardProps) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  useEffect(() => {
    if (!activeTask) setTasks(initialTasks)
  }, [initialTasks, activeTask])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const getByStatus = (s: TaskStatus) => tasks.filter(t => t.status === s)

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveTask(tasks.find(t => t.id === active.id) ?? null)
  }, [tasks])

  const handleDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return
    const activeId = active.id as string
    const overId   = over.id as string
    if (activeId === overId) return

    const activeTask = tasks.find(t => t.id === activeId)
    const overStatus = COLUMNS.includes(overId as TaskStatus)
      ? overId as TaskStatus
      : tasks.find(t => t.id === overId)?.status

    if (!activeTask || !overStatus || activeTask.status === overStatus) return

    setTasks(prev => prev.map(t => t.id === activeId ? { ...t, status: overStatus } : t))
  }, [tasks])

  const handleDragEnd = useCallback(async ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return

    const activeId = active.id as string
    const overId   = over.id as string

    const activeTask = tasks.find(t => t.id === activeId)
    if (!activeTask) return

    const newStatus = COLUMNS.includes(overId as TaskStatus)
      ? overId as TaskStatus
      : tasks.find(t => t.id === overId)?.status ?? activeTask.status

    // Reorder within column
    if (activeTask.status === newStatus && activeId !== overId) {
      setTasks(prev => {
        const col = prev.filter(t => t.status === newStatus)
        const ai  = col.findIndex(t => t.id === activeId)
        const oi  = col.findIndex(t => t.id === overId)
        const reordered = arrayMove(col, ai, oi)
        return prev.filter(t => t.status !== newStatus).concat(reordered)
      })
    }

    // Persist to Supabase
    if (newStatus !== activeTask.status) {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', activeId)
    }
  }, [tasks, supabase])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={getByStatus(status)}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 scale-105">
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
