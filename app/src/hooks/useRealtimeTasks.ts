'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task } from '@/types'

export function useRealtimeTasks(projectId?: string) {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Initial Fetch
  useEffect(() => {
    let isMounted = true
    const fetchTasks = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) { setLoading(false); return }

      let query = supabase.from('tasks').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
      if (projectId) query = query.eq('project_id', projectId)

      const { data, error } = await query
      if (isMounted) {
        if (error) setError(error.message)
        else setTasks(data || [])
        setLoading(false)
      }
    }
    fetchTasks()
    return () => { isMounted = false }
  }, [projectId, supabase])

  // 2. Realtime Subscription
  useEffect(() => {
    const channel = supabase.channel(`realtime_tasks_${projectId || 'all'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          setTasks((current) => {
            if (payload.eventType === 'INSERT') {
              if (projectId && payload.new.project_id !== projectId) return current
              const exists = current.find(t => t.id === payload.new.id)
              if (exists) return current
              return [payload.new as Task, ...current]
            }
            if (payload.eventType === 'UPDATE') {
              if (projectId && payload.new.project_id !== projectId) {
                // If it was moved out of this project, remove it
                return current.filter(t => t.id !== payload.new.id)
              }
              // If it's new to this project (moved in)
              const exists = current.find(t => t.id === payload.new.id)
              if (!exists && (!projectId || payload.new.project_id === projectId)) {
                return [payload.new as Task, ...current]
              }
              // Normal update
              return current.map(t => t.id === payload.new.id ? { ...t, ...payload.new } as Task : t)
            }
            if (payload.eventType === 'DELETE') {
              return current.filter(t => t.id !== payload.old.id)
            }
            return current
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, supabase])

  return { tasks, loading, error, setTasks }
}
