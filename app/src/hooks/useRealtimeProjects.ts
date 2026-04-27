'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project } from '@/types'

/**
 * Optimized Projects Hook (No Realtime)
 * 
 * Performance optimizations:
 * - Removed realtime subscription (only on detail page)
 * - Limited to 100 projects
 * - Select only needed columns
 * - Reduced latency for Tokyo → Indonesia connection
 */
export function useRealtimeProjects() {
  const supabase = createClient()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch projects (optimized query)
  useEffect(() => {
    let isMounted = true
    const fetchProjects = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user || !isMounted) { setLoading(false); return }

      // Optimized query: specific columns + limit
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, description, status, start_date, end_date, progress_percentage, created_at, owner_id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100) // Limit to 100 most recent projects

      if (isMounted) {
        if (error) {
          console.error('Error fetching projects:', error)
          setError(error.message)
        } else {
          setProjects(data || [])
        }
        setLoading(false)
      }
    }
    fetchProjects()
    return () => { isMounted = false }
  }, [supabase])

  // Note: Realtime subscription removed for performance
  // Realtime is only enabled on project detail page

  return { projects, loading, error, setProjects }
}
