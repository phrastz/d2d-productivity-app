'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-secondary/50 text-muted-foreground">
        <Moon className="h-5 w-5" />
      </button>
    )
  }

  const icon =
    theme === 'dark' ? <Moon className="h-5 w-5" /> :
    theme === 'light' ? <Sun className="h-5 w-5" /> :
    <Monitor className="h-5 w-5" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-foreground"
        aria-label="Toggle theme"
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={theme === 'light' ? 'text-violet-600 dark:text-violet-400 font-medium' : ''}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={theme === 'dark' ? 'text-violet-600 dark:text-violet-400 font-medium' : ''}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={theme === 'system' ? 'text-violet-600 dark:text-violet-400 font-medium' : ''}
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
