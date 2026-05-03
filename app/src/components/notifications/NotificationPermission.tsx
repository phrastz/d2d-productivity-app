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
        toast.success('Notifications enabled!')
        new Notification('D2D Tracking', {
          body: 'You will now receive deadline reminders',
          icon: '/icon-192x192.png',
        })
      } else {
        toast.error('Notification permission denied')
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
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
        ${permission === 'granted' 
          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-default' 
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
          <span className="hidden sm:inline">Enable Notifications</span>
        </>
      )}
    </button>
  )
}
