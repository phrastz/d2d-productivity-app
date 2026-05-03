'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationService } from '@/lib/notificationService'

export function useDailySummary() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const sendDailySummary = async () => {
      if (!('Notification' in window)) return
      if (Notification.permission !== 'granted') return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, end_date')
        .eq('owner_id', user.id)

      if (!tasks) return

      const summary = {
        dueToday: tasks.filter(t => {
          if (!t.end_date || t.status === 'done' || t.status === 'cancelled') return false
          const due = new Date(t.end_date)
          return due >= today && due < tomorrow
        }).length,
        overdue: tasks.filter(t => {
          if (!t.end_date || t.status === 'done' || t.status === 'cancelled') return false
          const due = new Date(t.end_date)
          return due < today
        }).length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length
      }

      await NotificationService.sendDailySummary(summary)
    }

    const scheduleDailySummary = () => {
      const now = new Date()
      const targetTime = new Date()
      targetTime.setHours(8, 0, 0, 0)

      if (now > targetTime) {
        targetTime.setDate(targetTime.getDate() + 1)
      }

      const msUntilTarget = targetTime.getTime() - now.getTime()

      const timeout = setTimeout(() => {
        sendDailySummary()
        scheduleDailySummary()
      }, msUntilTarget)

      return () => clearTimeout(timeout)
    }

    const cleanup = scheduleDailySummary()
    return cleanup
  }, [])
}
