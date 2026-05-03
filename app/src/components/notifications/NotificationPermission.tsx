'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'

export function NotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported in this browser')
      return
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      
      if (result === 'granted') {
        toast.success('Notifications enabled!', {
          description: 'You\'ll receive deadline reminders'
        })
        new Notification('D2D Tracking', {
          body: 'You will now receive deadline reminders',
          icon: '/icon.svg',
        })
      } else if (result === 'denied') {
        toast.error('Notifications blocked', {
          description: 'Click the 🔒 lock icon in your address bar → Notifications → Allow',
          duration: 8000
        })
      }
    } catch (error) {
      toast.error('Failed to enable notifications')
    }
  }

  if (!mounted) return null
  if (typeof window === 'undefined' || !('Notification' in window)) return null

  return (
    <button
      onClick={requestPermission}
      disabled={permission === 'granted'}
      title={
        permission === 'granted' 
          ? 'Notifications enabled' 
          : permission === 'denied'
          ? 'Notifications blocked - click to see how to enable'
          : 'Click to enable notifications'
      }
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${permission === 'granted' 
          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-default' 
          : permission === 'denied'
          ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }
      `}
    >
      {permission === 'granted' ? (
        <>
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications On</span>
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          <span className="hidden sm:inline">
            {permission === 'denied' ? 'Blocked' : 'Enable Notifications'}
          </span>
        </>
      )}
    </button>
  )
}
