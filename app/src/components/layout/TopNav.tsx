'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { NotificationPermission } from '@/components/notifications/NotificationPermission'

interface TopNavProps {
  title: string
  subtitle?: string
}

export default function TopNav({ title, subtitle }: TopNavProps) {
  const supabase = createClient()
  const [initials, setInitials] = useState('U')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      const name = user.user_metadata?.full_name as string | undefined
      setInitials(
        name
          ? name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          : (user.email?.[0]?.toUpperCase() ?? 'U')
      )
    })
  }, [])

  return (
    <header
      className="sticky top-0 z-30 glass px-6 py-4 bg-white/80 dark:bg-transparent border-b border-slate-200 dark:border-white/5"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-[hsl(213,31%,91%)]">{title}</h1>
          {subtitle && (
            <p className="text-xs mt-0.5 text-slate-600 dark:text-[hsl(215,20%,55%)]">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs hidden md:block text-slate-600 dark:text-[hsl(215,20%,55%)]">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
          <ThemeToggle />
          <NotificationPermission />
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(280 84% 55%))' }}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  )
}
