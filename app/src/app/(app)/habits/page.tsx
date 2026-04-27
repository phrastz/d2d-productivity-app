'use client'

import { useState } from 'react'
import { useHabitData } from '@/hooks/useHabitData'
import TopNav from '@/components/layout/TopNav'
import HabitStats from '@/components/habits/HabitStats'
import HabitHeatmap from '@/components/habits/HabitHeatmap'
import TodayHabits from '@/components/habits/TodayHabits'
import AddHabitDialog from '@/components/habits/AddHabitDialog'
import { Loader2, Activity } from 'lucide-react'

export default function HabitsPage() {
  const { heatmapData, stats, activeHabits, loading, error } = useHabitData()
  const [showAddDialog, setShowAddDialog] = useState(false)

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <TopNav title="Habits" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading habit data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col">
        <TopNav title="Habits" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-red-400 mb-2">Error loading habits</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <TopNav title="Habits" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Habit Tracker</h1>
            <p className="text-sm text-muted-foreground">Build consistency, one day at a time</p>
          </div>
        </div>

        {/* Stats Bar */}
        <HabitStats stats={stats} />

        {/* Heatmap */}
        <div className="glass rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-foreground">365-Day Activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your habit completion history for the past year
            </p>
          </div>
          <HabitHeatmap data={heatmapData} />
        </div>

        {/* Today's Habits */}
        <TodayHabits habits={activeHabits} onAddHabit={() => setShowAddDialog(true)} />

        {/* Add Habit Dialog */}
        <AddHabitDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} />
      </div>
    </div>
  )
}
