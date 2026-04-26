'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckSquare, FolderKanban,
  BarChart3, BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Tasks',      href: '/tasks',       icon: CheckSquare },
  { label: 'Projects',   href: '/projects',    icon: FolderKanban },
  { label: 'Reports',    href: '/reports',     icon: BarChart3 },
  { label: 'Daily Log',  href: '/daily-log',   icon: BookOpen },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/5 md:hidden pb-safe">
      <div className="flex items-center justify-around p-2">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-xl min-w-[4rem] transition-all',
                active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
