'use client'

import { useState } from 'react'
import { Task } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { Trash2, Plus } from 'lucide-react'

interface TodayHabitsProps {
  habits: Task[]
  onAddHabit: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  Health: 'bg-green-500/20 text-green-400 border-green-500/30',
  Learning: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Work: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Personal: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

export default function TodayHabits({ habits, onAddHabit }: TodayHabitsProps) {
  const supabase = createClient()
  const [updating, setUpdating] = useState<string | null>(null)
  const today = format(new Date(), 'yyyy-MM-dd')

  // Filter habits completed today
  const todayCompletedHabits = habits.filter(
    h => h.status === 'done' && h.due_date?.startsWith(today)
  )

  const handleToggleHabit = async (habit: Task, checked: boolean) => {
    setUpdating(habit.id)

    try {
      if (checked) {
        // Mark as done for today
        const { error } = await supabase
          .from('tasks')
          .update({
            status: 'done',
            due_date: new Date().toISOString(),
          })
          .eq('id', habit.id)

        if (error) throw error
      } else {
        // Mark as todo
        const { error } = await supabase
          .from('tasks')
          .update({
            status: 'todo',
            due_date: null,
          })
          .eq('id', habit.id)

        if (error) throw error
      }
    } catch (err) {
      console.error('Error updating habit:', err)
      alert('Failed to update habit')
    } finally {
      setUpdating(null)
    }
  }

  const handleDeleteHabit = async (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit?')) return

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', habitId)

      if (error) throw error
    } catch (err) {
      console.error('Error deleting habit:', err)
      alert('Failed to delete habit')
    }
  }

  const isCompletedToday = (habit: Task) => {
    return habit.status === 'done' && habit.due_date?.startsWith(today)
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Today's Habits</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {todayCompletedHabits.length} of {habits.length} completed
          </p>
        </div>
        <button
          onClick={onAddHabit}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Habit
        </button>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm mb-2">No habits yet</p>
          <p className="text-xs">Click "Add Habit" to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => {
            const completed = isCompletedToday(habit)
            const category = habit.habit_category || 'Personal'

            return (
              <div
                key={habit.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors group"
              >
                {/* Checkbox */}
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={completed}
                    disabled={updating === habit.id}
                    onChange={(e) => handleToggleHabit(habit, e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-slate-600 bg-slate-800 checked:bg-violet-500 checked:border-violet-500 cursor-pointer transition-colors"
                  />
                </label>

                {/* Habit info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {habit.title}
                  </p>
                  {habit.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {habit.description}
                    </p>
                  )}
                </div>

                {/* Category badge */}
                <div
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                    CATEGORY_COLORS[category] || CATEGORY_COLORS.Personal
                  }`}
                >
                  {category}
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
