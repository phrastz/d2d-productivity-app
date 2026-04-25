'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
      className="sticky top-0 z-30 glass px-6 py-4"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'hsl(213 31% 91%)' }}>{title}</h1>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: 'hsl(215 20% 55%)' }}>{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-xs hidden md:block" style={{ color: 'hsl(215 20% 55%)' }}>
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative"
            style={{ color: 'hsl(215 20% 55%)' }}
          >
            <Bell className="w-4 h-4" />
            <span
              className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
              style={{ background: 'hsl(250 84% 65%)' }}
            />
          </button>
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
