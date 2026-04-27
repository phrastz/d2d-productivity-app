'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, FolderKanban,
  BarChart3, BookOpen, Zap, Settings, LogOut, Calendar, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

const navItems = [
  { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Tasks',      href: '/tasks',       icon: CheckSquare },
  { label: 'Projects',   href: '/projects',    icon: FolderKanban },
  { label: 'Calendar',   href: '/calendar',    icon: Calendar },
  { label: 'Habits',     href: '/habits',      icon: Activity },
  { label: 'Reports',    href: '/reports',     icon: BarChart3 },
  { label: 'Daily Log',  href: '/daily-log',   icon: BookOpen },
]

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()

  const [userName, setUserName]   = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [initials, setInitials]   = useState<string>('U')
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) return

      const fullName = user.user_metadata?.full_name as string | undefined
      const email    = user.email ?? ''

      setUserEmail(email)
      setUserName(fullName || email.split('@')[0])
      setInitials(
        fullName
          ? fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
          : email[0]?.toUpperCase() ?? 'U'
      )
    }
    loadUser()
  }, [supabase])

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen hidden md:flex flex-col glass border-r border-white/5 z-40"
      style={{ width: 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center animate-pulse-glow flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(280 84% 55%))' }}
          >
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold gradient-text">D2D Tracking</p>
            <p className="text-[10px]" style={{ color: 'hsl(215 20% 45%)' }}>Productivity Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest px-3 pt-2 pb-2" style={{ color: 'hsl(215 20% 40%)' }}>
          Workspace
        </p>
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn('sidebar-item', active && 'sidebar-item-active')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {active && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: 'hsl(250 84% 65%)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + Bottom */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <Link href="/settings" className="sidebar-item">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="sidebar-item w-full"
          style={{ color: signingOut ? 'hsl(215 20% 40%)' : undefined }}
          onMouseEnter={e => !signingOut && ((e.currentTarget as HTMLElement).style.color = '#f87171')}
          onMouseLeave={e => !signingOut && ((e.currentTarget as HTMLElement).style.color = '')}
        >
          <LogOut className="w-4 h-4" />
          <span>{signingOut ? 'Signing out…' : 'Sign Out'}</span>
        </button>

        {/* User info */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-1"
          style={{ background: 'hsl(222 47% 11%)' }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(250 84% 65%), hsl(280 84% 55%))' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'hsl(213 31% 91%)' }}>
              {userName || 'Loading…'}
            </p>
            <p className="text-[10px] truncate" style={{ color: 'hsl(215 20% 45%)' }}>
              {userEmail}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
