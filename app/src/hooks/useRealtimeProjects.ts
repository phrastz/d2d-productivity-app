'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'

export function useRealtimeProjects() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Initial Fetch
  useEffect(() => {
    let isMounted = true
    const fetchProjects = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !isMounted) { setLoading(false); return }

      const { data, error } = await supabase.from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (isMounted) {
        if (error) setError(error.message)
        else setProjects(data || [])
        setLoading(false)
      }
    }
    fetchProjects()
    return () => { isMounted = false }
  }, [supabase])

  // 2. Realtime Subscription
  useEffect(() => {
    const channelId = `realtime_projects_${Math.random().toString(36).substring(7)}`
    const channel = supabase.channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          setProjects((current) => {
            if (payload.eventType === 'INSERT') {
              const exists = current.find(p => p.id === payload.new.id)
              if (exists) return current
              return [payload.new as Project, ...current]
            }
            if (payload.eventType === 'UPDATE') {
              return current.map(p => p.id === payload.new.id ? { ...p, ...payload.new } as Project : p)
            }
            if (payload.eventType === 'DELETE') {
              return current.filter(p => p.id !== payload.old.id)
            }
            return current
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return { projects, loading, error, setProjects }
}
