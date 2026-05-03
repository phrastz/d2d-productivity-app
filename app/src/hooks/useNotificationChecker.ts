'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NotificationService } from '@/lib/notificationService'

export function useNotificationChecker() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkUpcomingDeadlines = async () => {
      if (!('Notification' in window)) return
      if (Notification.permission !== 'granted') return

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, end_date, priority, status')
        .eq('owner_id', user.id)
        .neq('status', 'done')
        .neq('status', 'cancelled')
        .not('end_date', 'is', null)
        .gte('end_date', now.toISOString().split('T')[0])
        .lte('end_date', tomorrow.toISOString().split('T')[0])

      if (!tasks || tasks.length === 0) return

      for (const task of tasks) {
        const dueDate = new Date(task.end_date)
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)

        if (
          hoursUntilDue <= 1 || 
          (task.priority === 'high' && hoursUntilDue <= 24)
        ) {
          await NotificationService.sendTaskReminder(task)
        }
      }
    }

    const interval = setInterval(checkUpcomingDeadlines, 15 * 60 * 1000)
    checkUpcomingDeadlines()

    return () => clearInterval(interval)
  }, [])
}
