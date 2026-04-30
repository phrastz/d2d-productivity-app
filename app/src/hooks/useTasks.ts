'use client'

import { createClient } from '@/lib/supabase/client'

interface CreateTaskPayload {
  title: string
  project_id: string
  sub_project_id: string | null
  progress_percent?: number
  start_date?: string | null
  end_date?: string | null
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  status?: 'todo' | 'in_progress' | 'done'
}

export function useTasks() {
  const supabase = createClient()

  const createTask = async (payload: CreateTaskPayload) => {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: payload.title.trim(),
        project_id: payload.project_id,
        sub_project_id: payload.sub_project_id,
        owner_id: userId,
        status: payload.status ?? 'todo',
        priority: payload.priority ?? 'medium',
        progress_percent: payload.progress_percent ?? 0,
        start_date: payload.start_date ?? null,
        end_date: payload.end_date ?? null,
      })
      .select()
      .single()

    if (error) {
      console.error('createTask error:', error)
      throw error
    }
    return data
  }

  const updateTaskProgress = async (
    taskId: string,
    progressPercent: number
  ) => {
    const clamped = Math.min(100, Math.max(0, progressPercent))
    const newStatus =
      clamped === 100 ? 'done' : clamped > 0 ? 'in_progress' : 'todo'

    const { error } = await supabase
      .from('tasks')
      .update({ progress_percent: clamped, status: newStatus })
      .eq('id', taskId)

    if (error) throw error
  }

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) throw error
  }

  return { createTask, updateTaskProgress, deleteTask }
}
