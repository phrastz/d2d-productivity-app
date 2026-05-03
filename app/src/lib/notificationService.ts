export interface NotificationOptions {
  title: string
  body: string
  tag?: string
  icon?: string
  badge?: string
  requireInteraction?: boolean
  data?: any
}

export class NotificationService {
  static async send(options: NotificationOptions) {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported')
      return
    }

    if (Notification.permission !== 'granted') {
      console.warn('Notification permission not granted')
      return
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/icons/icon-192x192.png',
      badge: options.badge || '/icons/icon-72x72.png',
      tag: options.tag || 'dailyflow',
      requireInteraction: options.requireInteraction || false,
      data: options.data,
    })

    notification.onclick = () => {
      window.focus()
      if (options.data?.url) {
        window.location.href = options.data.url
      }
      notification.close()
    }

    return notification
  }

  static async sendTaskReminder(task: {
    id: string
    title: string
    end_date: string
    priority: string
  }) {
    const dueDate = new Date(task.end_date)
    const now = new Date()
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    let urgency = 'normal'
    let emoji = '📅'
    
    if (hoursUntilDue < 0) {
      urgency = 'overdue'
      emoji = '🚨'
    } else if (hoursUntilDue < 1) {
      urgency = 'urgent'
      emoji = '⚠️'
    } else if (hoursUntilDue < 24) {
      urgency = 'today'
      emoji = '⏰'
    }

    await this.send({
      title: `${emoji} Task Due: ${task.title}`,
      body: `${urgency === 'overdue' ? 'OVERDUE' : `Due ${dueDate.toLocaleString()}`}`,
      tag: `task-${task.id}`,
      requireInteraction: urgency === 'overdue' || urgency === 'urgent',
      data: {
        url: `/tasks`,
        taskId: task.id,
        urgency
      }
    })
  }

  static async sendDailySummary(summary: {
    dueToday: number
    overdue: number
    inProgress: number
  }) {
    let body = ''
    if (summary.overdue > 0) {
      body += `🚨 ${summary.overdue} overdue tasks\n` 
    }
    if (summary.dueToday > 0) {
      body += `📅 ${summary.dueToday} due today\n` 
    }
    if (summary.inProgress > 0) {
      body += `🔄 ${summary.inProgress} in progress` 
    }

    await this.send({
      title: '☀️ Good Morning! Your Daily Summary',
      body: body || 'No urgent tasks today!',
      tag: 'daily-summary',
      requireInteraction: summary.overdue > 0,
      data: { url: '/dashboard' }
    })
  }
}
