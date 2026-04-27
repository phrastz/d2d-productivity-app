'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task } from '@/types'
import { startOfDay, subDays, format, parseISO, differenceInDays } from 'date-fns'

export interface HabitDayData {
  date: string // YYYY-MM-DD
  count: number
  habits: string[] // habit titles completed on this day
}

export interface HabitStats {
  currentStreak: number
  longestStreak: number
  totalCompletions: number
}

export interface HabitData {
  heatmapData: HabitDayData[]
  stats: HabitStats
  activeHabits: Task[]
  loading: boolean
  error: string | null
}

export function useHabitData(): HabitData {
  const [heatmapData, setHeatmapData] = useState<HabitDayData[]>([])
  const [stats, setStats] = useState<HabitStats>({
    currentStreak: 0,
    longestStreak: 0,
    totalCompletions: 0,
  })
  const [activeHabits, setActiveHabits] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const fetchHabitData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get session
        const { data: { session } } = await supabase.auth.getSession()
        const userId = session?.user?.id
        if (!userId) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        // Calculate date range (past 365 days)
        const today = startOfDay(new Date())
        const startDate = subDays(today, 364) // 365 days including today

        // Fetch completed habits for the past year
        const { data: completedHabits, error: fetchError } = await supabase
          .from('tasks')
          .select('*')
          .eq('owner_id', userId)
          .eq('is_habit', true)
          .eq('status', 'done')
          .gte('due_date', format(startDate, 'yyyy-MM-dd'))
          .lte('due_date', format(today, 'yyyy-MM-dd'))
          .order('due_date', { ascending: true })

        if (fetchError) throw fetchError

        // Fetch all active habits (for today's section)
        const { data: allHabits, error: habitsError } = await supabase
          .from('tasks')
          .select('*')
          .eq('owner_id', userId)
          .eq('is_habit', true)
          .order('created_at', { ascending: false })

        if (habitsError) throw habitsError

        if (!mounted) return

        // Process heatmap data
        const habitsByDate = new Map<string, HabitDayData>()

        // Initialize all dates with 0 count
        for (let i = 0; i < 365; i++) {
          const date = format(subDays(today, 364 - i), 'yyyy-MM-dd')
          habitsByDate.set(date, { date, count: 0, habits: [] })
        }

        // Populate with actual completions
        completedHabits?.forEach((habit: Task) => {
          if (habit.due_date) {
            const dateKey = habit.due_date.split('T')[0] // Get YYYY-MM-DD part
            const existing = habitsByDate.get(dateKey)
            if (existing) {
              existing.count++
              existing.habits.push(habit.title)
            }
          }
        })

        const heatmapArray = Array.from(habitsByDate.values())

        // Calculate stats
        const calculatedStats = calculateStats(heatmapArray, today)

        setHeatmapData(heatmapArray)
        setStats(calculatedStats)
        setActiveHabits(allHabits || [])

      } catch (err) {
        console.error('Error fetching habit data:', err)
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load habit data')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchHabitData()

    // Set up realtime subscription
    const channel = supabase
      .channel('habit-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `is_habit=eq.true`,
        },
        () => {
          // Refetch data when habits change
          fetchHabitData()
        }
      )
      .subscribe()

    return () => {
      mounted = false
      channel.unsubscribe()
    }
  }, [])

  return { heatmapData, stats, activeHabits, loading, error }
}

function calculateStats(heatmapData: HabitDayData[], today: Date): HabitStats {
  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 0
  let totalCompletions = 0

  // Sort by date descending to calculate current streak from today backwards
  const sortedData = [...heatmapData].sort((a, b) => b.date.localeCompare(a.date))

  // Calculate current streak (from today backwards)
  for (const day of sortedData) {
    const dayDate = parseISO(day.date)
    const daysDiff = differenceInDays(today, dayDate)

    if (daysDiff === currentStreak && day.count > 0) {
      currentStreak++
    } else if (daysDiff > currentStreak) {
      break
    }
  }

  // Calculate longest streak and total completions
  const sortedAsc = [...heatmapData].sort((a, b) => a.date.localeCompare(b.date))

  for (const day of sortedAsc) {
    totalCompletions += day.count

    if (day.count > 0) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalCompletions,
  }
}
