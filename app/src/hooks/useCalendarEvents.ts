'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, Project, DailyLog } from '@/types'

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  resource: {
    type: 'task' | 'project' | 'daily_log'
    originalId: string
    color: string
    data: Task | Project | DailyLog
  }
}

const COLORS = {
  task: '#3b82f6',      // blue
  project: '#8b5cf6',   // purple
  daily_log: '#10b981'  // green
}

export function useCalendarEvents() {
  const supabase = createClient()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to convert data to calendar events
  const mapToEvents = (
    tasks: Task[],
    projects: Project[],
    dailyLogs: DailyLog[]
  ): CalendarEvent[] => {
    const taskEvents: CalendarEvent[] = tasks
      .filter(t => t.due_date)
      .map(task => ({
        id: `task-${task.id}`,
        title: task.title,
        start: new Date(task.due_date!),
        end: new Date(task.due_date!),
        resource: {
          type: 'task' as const,
          originalId: task.id,
          color: COLORS.task,
          data: task
        }
      }))

    const projectEvents: CalendarEvent[] = projects
      .filter(p => p.start_date && p.end_date)
      .map(project => ({
        id: `project-${project.id}`,
        title: project.name,
        start: new Date(project.start_date!),
        end: new Date(project.end_date!),
        resource: {
          type: 'project' as const,
          originalId: project.id,
          color: COLORS.project,
          data: project
        }
      }))

    const logEvents: CalendarEvent[] = dailyLogs
      .filter(log => log.date)
      .map(log => ({
        id: `log-${log.id}`,
        title: log.summary || 'Daily Log',
        start: new Date(log.date),
        end: new Date(log.date),
        resource: {
          type: 'daily_log' as const,
          originalId: log.id,
          color: COLORS.daily_log,
          data: log
        }
      }))

    return [...taskEvents, ...projectEvents, ...logEvents]
  }

  // Initial fetch
  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      
      if (!user || !isMounted) {
        setLoading(false)
        return
      }

      try {
        // Fetch all data in parallel
        const [tasksResult, projectsResult, logsResult] = await Promise.all([
          supabase
            .from('tasks')
            .select('*')
            .eq('owner_id', user.id)
            .not('due_date', 'is', null),
          supabase
            .from('projects')
            .select('*')
            .eq('owner_id', user.id)
            .not('start_date', 'is', null)
            .not('end_date', 'is', null),
          supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', user.id)
        ])

        if (isMounted) {
          const tasks = tasksResult.data || []
          const projects = projectsResult.data || []
          const logs = logsResult.data || []

          setEvents(mapToEvents(tasks, projects, logs))
          setLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch calendar data')
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => { isMounted = false }
  }, [supabase])

  // Realtime subscription for tasks
  useEffect(() => {
    const channelId = `calendar_tasks_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          setEvents((current) => {
            const oldId = (payload.old as any)?.id
            const filtered = current.filter(e => e.resource.type !== 'task' || e.resource.originalId !== oldId)
            
            if (payload.eventType === 'DELETE') {
              return filtered
            }

            const task = payload.new as Task
            if (!task.due_date) return filtered

            const newEvent: CalendarEvent = {
              id: `task-${task.id}`,
              title: task.title,
              start: new Date(task.due_date),
              end: new Date(task.due_date),
              resource: {
                type: 'task',
                originalId: task.id,
                color: COLORS.task,
                data: task
              }
            }

            return [...filtered, newEvent]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Realtime subscription for projects
  useEffect(() => {
    const channelId = `calendar_projects_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => {
          setEvents((current) => {
            const oldId = (payload.old as any)?.id
            const filtered = current.filter(e => e.resource.type !== 'project' || e.resource.originalId !== oldId)
            
            if (payload.eventType === 'DELETE') {
              return filtered
            }

            const project = payload.new as Project
            if (!project.start_date || !project.end_date) return filtered

            const newEvent: CalendarEvent = {
              id: `project-${project.id}`,
              title: project.name,
              start: new Date(project.start_date),
              end: new Date(project.end_date),
              resource: {
                type: 'project',
                originalId: project.id,
                color: COLORS.project,
                data: project
              }
            }

            return [...filtered, newEvent]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Realtime subscription for daily logs
  useEffect(() => {
    const channelId = `calendar_logs_${Math.random().toString(36).substring(7)}`
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs' },
        (payload) => {
          setEvents((current) => {
            const oldId = (payload.old as any)?.id
            const filtered = current.filter(e => e.resource.type !== 'daily_log' || e.resource.originalId !== oldId)
            
            if (payload.eventType === 'DELETE') {
              return filtered
            }

            const log = payload.new as DailyLog
            if (!log.date) return filtered

            const newEvent: CalendarEvent = {
              id: `log-${log.id}`,
              title: log.summary || 'Daily Log',
              start: new Date(log.date),
              end: new Date(log.date),
              resource: {
                type: 'daily_log',
                originalId: log.id,
                color: COLORS.daily_log,
                data: log
              }
            }

            return [...filtered, newEvent]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return { events, loading, error, setEvents }
}
