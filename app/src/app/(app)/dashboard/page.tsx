'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, Project } from '@/types'
import TodaysFocus from '@/components/dashboard/TodaysFocus'
import ProjectProgress from '@/components/dashboard/ProjectProgress'
import WeeklyChart from '@/components/dashboard/WeeklyChart'
import TopNav from '@/components/layout/TopNav'
import { useWeeklyData, useStats } from '@/hooks/useDashboard'
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks'
import { useRealtimeProjects } from '@/hooks/useRealtimeProjects'
import { CheckCircle2, Clock3, Flame, Timer } from 'lucide-react'

export default function DashboardPage() {
  const supabase = createClient()
  const { tasks, loading: tasksLoading, setTasks } = useRealtimeTasks()
  const { projects, loading: projectsLoading } = useRealtimeProjects()
  const loading = tasksLoading || projectsLoading

  const handleToggle = useCallback(async (id: string, newStatus: Task['status']) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id)
  }, [setTasks, supabase])

  const weeklyData = useWeeklyData(tasks)
  const stats = useStats(tasks)

  const statCards = [
    { label: 'Done',        value: stats.done,         icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'In Progress', value: stats.inProgress,   icon: Clock3,       color: 'text-amber-400',   bg: 'bg-amber-500/10' },
    { label: 'Habits',      value: stats.habits,       icon: Flame,        color: 'text-orange-400',  bg: 'bg-orange-500/10' },
    { label: 'Hours Logged',value: Math.round(stats.totalMinutes / 60), icon: Timer, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ]

  if (loading) {
    return (
      <>
        <TopNav title="Dashboard" subtitle="Your daily command center" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title="Dashboard" subtitle="Your daily command center" />
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass rounded-2xl p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Focus - 1 col */}
          <div className="lg:col-span-1">
            <TodaysFocus tasks={tasks} onToggle={handleToggle} />
          </div>

          {/* Project Progress - 1 col */}
          <div className="lg:col-span-1">
            <ProjectProgress projects={projects} />
          </div>

          {/* Weekly Chart - 1 col */}
          <div className="lg:col-span-1">
            <WeeklyChart data={weeklyData} />
          </div>
        </div>
      </div>
    </>
  )
}
