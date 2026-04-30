'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, SubProject, Task } from '@/types'

interface ProjectDetail extends Project {
  sub_projects: SubProject[]
  directTasks: Task[]
}

// ── Progress helpers (spec: PROJECT REVISION.txt) ──────────────────────────

function calculateSubProjectProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0
  const sum = tasks.reduce((acc, t) => acc + (t.progress_percent ?? 0), 0)
  return Math.round(sum / tasks.length)
}

function calculateProjectProgress(
  subProjects: (SubProject & { progress_percent: number; weight_contribution: number; tasks?: Task[] })[],
  directTasks: Task[]
): number {
  const totalItems = subProjects.length + directTasks.length
  if (totalItems === 0) return 0

  const totalSubWeight = subProjects.reduce((s, sp) => s + (sp.weight_contribution ?? 1), 0)
  const weightedSubProgress = subProjects.reduce(
    (s, sp) => s + (sp.progress_percent ?? 0) * (sp.weight_contribution ?? 1),
    0
  )
  const directProgress = directTasks.reduce((s, t) => s + (t.progress_percent ?? 0), 0)

  const subContrib =
    totalSubWeight > 0
      ? (weightedSubProgress / totalSubWeight) * (subProjects.length / totalItems)
      : 0
  const directContrib =
    directTasks.length > 0
      ? (directProgress / directTasks.length) * (directTasks.length / totalItems)
      : 0

  return Math.round((subContrib + directContrib) * 100) / 100
}
// ───────────────────────────────────────────────────────────────────────────

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

        // Step 5: Calculate progress for each sub-project using avg progress_percent
        const enrichedSubProjects: SubProject[] = subProjectsData.map((sp: SubProject) => {
          const tasks = tasksBySubProject.get(sp.id) || []
          const tasks_total = tasks.length
          const tasks_done = tasks.filter(t => t.status === 'done').length
          // ✅ Use weighted average of task progress_percent (spec compliant)
          const progress_percent = calculateSubProjectProgress(tasks)

          return {
            ...sp,
            tasks,
            tasks_total,
            tasks_done,
            progress: progress_percent,       // runtime display alias
            progress_percent,                 // persisted field
          }
        })

        // Step 6: Calculate overall project progress — weighted average (spec compliant)
        const overallProgress = calculateProjectProgress(enrichedSubProjects, directTasks)

        // For display: total task counts across all tasks
        const totalTasks = allTasks.length
        const doneTasks = allTasks.filter((t: Task) => t.status === 'done').length

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
