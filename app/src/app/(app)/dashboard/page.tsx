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
import { CheckCircle2, Clock3, Flame, Timer, Calendar } from 'lucide-react'
import Link from 'next/link'

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
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        <TopNav title="Dashboard" subtitle="Your daily command center" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <TopNav title="Dashboard" subtitle="Your daily command center" />
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Calendar Banner */}
        <div className="glass bg-white dark:bg-slate-900/90 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-violet-500/10 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Interactive Calendar</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">Plan your week visually. Drag & drop tasks and projects.</p>
            </div>
          </div>
          <Link href="/calendar" className="px-6 py-2.5 rounded-xl bg-violet-600 dark:bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors whitespace-nowrap">
            Open Calendar
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass bg-white dark:bg-slate-900/90 rounded-2xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-800">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{label}</p>
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
    </div>
  )
}
