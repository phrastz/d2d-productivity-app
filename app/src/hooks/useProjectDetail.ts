'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, SubProject, Task } from '@/types'

interface ProjectDetail extends Project {
  sub_projects: SubProject[]
  directTasks: Task[]
}

export function useProjectDetail(projectId: string | null) {
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      setLoading(false)
      return
    }

    const supabase = createClient()
    let mounted = true

    const fetchProjectDetail = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get session
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (!userId || !mounted) {
          if (!userId) setError('Not authenticated')
          setLoading(false)
          return
        }

        // Step 1: Fetch project first (separate query)
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('owner_id', userId)
          .single()

        if (projectError) throw projectError
        if (!projectData) {
          setError('Project not found')
          setLoading(false)
          return
        }

        if (!mounted) return

        // Step 2: Fetch sub_projects separately with graceful fallback
        let subProjectsData: SubProject[] = []
        try {
          const { data, error } = await supabase
            .from('sub_projects')
            .select('*')
            .eq('project_id', projectId)
            .order('order_index', { ascending: true })

          if (!error && data) {
            subProjectsData = data
          } else if (error) {
            console.warn('sub_projects query failed (table may not be in schema cache):', error.message)
          }
        } catch (err) {
          console.warn('sub_projects table not ready yet, using empty array:', err)
        }

        if (!mounted) return

        // Step 3: Fetch all tasks for this project
        let allTasks: Task[] = []
        try {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })

          if (!error && data) {
            allTasks = data
          } else if (error) {
            console.warn('tasks query failed:', error.message)
          }
        } catch (err) {
          console.warn('Could not fetch tasks:', err)
        }

        if (!mounted) return

        // Step 4: Separate tasks into direct tasks vs sub-project tasks
        const directTasks: Task[] = []
        const tasksBySubProject = new Map<string, Task[]>()

        allTasks.forEach((task: Task) => {
          if (task.sub_project_id) {
            if (!tasksBySubProject.has(task.sub_project_id)) {
              tasksBySubProject.set(task.sub_project_id, [])
            }
            tasksBySubProject.get(task.sub_project_id)!.push(task)
          } else {
            directTasks.push(task)
          }
        })

        // Step 5: Calculate progress for each sub-project
        const enrichedSubProjects: SubProject[] = subProjectsData.map((sp: SubProject) => {
          const tasks = tasksBySubProject.get(sp.id) || []
          const tasks_total = tasks.length
          const tasks_done = tasks.filter(t => t.status === 'done').length
          const progress = tasks_total > 0 ? Math.round((tasks_done / tasks_total) * 100) : 0

          return {
            ...sp,
            tasks,
            tasks_total,
            tasks_done,
            progress,
          }
        })

        // Step 6: Calculate overall project progress (weighted by task count)
        const totalTasks = allTasks.length
        const doneTasks = allTasks.filter((t: Task) => t.status === 'done').length
        const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

        if (!mounted) return

        const enrichedProject: ProjectDetail = {
          ...projectData,
          sub_projects: enrichedSubProjects,
          directTasks,
          progress: overallProgress,
          tasks_total: totalTasks,
          tasks_done: doneTasks,
        }

        setProject(enrichedProject)

      } catch (err) {
        console.error('Error fetching project detail:', err)
        if (mounted) {
          let errorMessage = 'Failed to load project'

          if (err instanceof Error) {
            errorMessage = err.message
          } else if (typeof err === 'object' && err !== null) {
            errorMessage = JSON.stringify(err, null, 2)
          } else if (typeof err === 'string') {
            errorMessage = err
          }

          setError(errorMessage)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchProjectDetail()

    // Set up realtime subscriptions with error handling
    const tasksChannel = supabase
      .channel(`project-${projectId}-tasks`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchProjectDetail()
        }
      )
      .subscribe()

    // Sub-projects realtime subscription (may fail if table not in schema cache)
    let subProjectsChannel: any = null
    try {
      subProjectsChannel = supabase
        .channel(`project-${projectId}-subprojects`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sub_projects',
            filter: `project_id=eq.${projectId}`,
          },
          () => {
            fetchProjectDetail()
          }
        )
        .subscribe()
    } catch (err) {
      console.warn('Could not subscribe to sub_projects realtime (table may not be in schema cache):', err)
    }

    return () => {
      mounted = false
      tasksChannel.unsubscribe()
      if (subProjectsChannel) {
        try {
          subProjectsChannel.unsubscribe()
        } catch (err) {
          console.warn('Error unsubscribing from sub_projects channel:', err)
        }
      }
    }
  }, [projectId])

  return { project, loading, error }
}
