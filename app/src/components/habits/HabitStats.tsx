'use client'

import { HabitStats as Stats } from '@/hooks/useHabitData'
import { Flame, Trophy, CheckCircle2 } from 'lucide-react'

interface HabitStatsProps {
  stats: Stats
}

export default function HabitStats({ stats }: HabitStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Current Streak */}
      <div className="glass rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center flex-shrink-0">
          <Flame className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <p className="text-2xl font-bold gradient-text">{stats.currentStreak}</p>
          <p className="text-xs text-muted-foreground">Current Streak</p>
        </div>
      </div>

      {/* Longest Streak */}
      <div className="glass rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-6 h-6 text-yellow-400" />
        </div>
        <div>
          <p className="text-2xl font-bold gradient-text">{stats.longestStreak}</p>
          <p className="text-xs text-muted-foreground">Longest Streak</p>
        </div>
      </div>

      {/* Total This Year */}
      <div className="glass rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <p className="text-2xl font-bold gradient-text">{stats.totalCompletions}</p>
          <p className="text-xs text-muted-foreground">Total This Year</p>
        </div>
      </div>
    </div>
  )
}
