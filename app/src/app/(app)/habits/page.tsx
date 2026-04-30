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
      <div className="bg-slate-950 min-h-screen flex flex-col">
        <TopNav title="Habits" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-300">Loading habit data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-950 min-h-screen flex flex-col">
        <TopNav title="Habits" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
            <p className="text-sm font-semibold text-red-400 mb-2">Error loading habits</p>
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-950 min-h-screen flex flex-col">
      <TopNav title="Habits" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Habit Tracker</h1>
            <p className="text-sm text-slate-300">Build consistency, one day at a time</p>
          </div>
        </div>

        {/* Stats Bar */}
        <HabitStats stats={stats} />

        {/* Heatmap */}
        <div className="glass bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">365-Day Activity</h2>
            <p className="text-xs text-slate-400 mt-0.5">
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
