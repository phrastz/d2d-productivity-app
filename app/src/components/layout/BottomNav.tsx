'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, CheckSquare, FolderKanban,
  BarChart3, RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Tasks',     href: '/tasks',      icon: CheckSquare },
  { label: 'Projects',  href: '/projects',   icon: FolderKanban },
  { label: 'Routines',  href: '/routines',   icon: RefreshCw },
  { label: 'Reports',   href: '/reports',    icon: BarChart3 },
]

export default function BottomNav() {
  const pathname = usePathname()
  const supabase = createClient()
  const [routineOverdue, setRoutineOverdue] = useState(0)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const today = new Date().toISOString().split('T')[0]
      const { count } = await supabase
        .from('routine_occurrences')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('status', 'pending')
        .lt('due_date', today)
      setRoutineOverdue(count ?? 0)
    }
    check()
  }, [supabase])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/5 md:hidden pb-safe">
      <div className="flex items-center justify-around p-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          const isRoutines = href === '/routines'
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex flex-col items-center justify-center p-2 rounded-xl min-w-[4rem] transition-all',
                active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-medium">{label}</span>
              {isRoutines && routineOverdue > 0 && !active && (
                <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white">
                  {routineOverdue > 9 ? '9+' : routineOverdue}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
