'use client'

import { useMemo } from 'react'
import { Task } from '@/types'
import { startOfWeek, addDays, format, parseISO, isWithinInterval } from 'date-fns'

export function useWeeklyData(tasks: Task[]) {
  return useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const dayLabel = format(day, 'EEE')
      const dayTasks = tasks.filter(t => {
        if (!t.due_date) return false
        const d = parseISO(t.due_date)
        return isWithinInterval(d, { start: day, end: addDays(day, 1) })
      })
      return {
        day: dayLabel,
        completed: dayTasks.filter(t => t.status === 'done').length,
        remaining: dayTasks.filter(t => t.status !== 'done').length,
        total: dayTasks.length,
      }
    })
  }, [tasks])
}

export function useStats(tasks: Task[]) {
  return useMemo(() => {
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'done').length
    const inProgress = tasks.filter(t => t.status === 'in_progress').length
    const habits = tasks.filter(t => t.is_habit).length
    const totalMinutes = tasks.reduce((s, t) => s + (t.time_spent_minutes || 0), 0)
    return { total, done, inProgress, habits, totalMinutes }
  }, [tasks])
}
