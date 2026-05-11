'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, DailyLog, WeeklyReport } from '@/types'
import TopNav from '@/components/layout/TopNav'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import { startOfWeek, addDays, format, parseISO, isWithinInterval } from 'date-fns'
import { TrendingUp, CheckCircle2, Clock, Smile, Frown, Meh, FolderOpen, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReportTemplateCard } from '@/components/reports/ReportTemplateCard'

const MOOD_COLORS: Record<string, string> = {
  great: '#10b981', good: '#6366f1', okay: '#f59e0b', bad: '#f97316', terrible: '#ef4444'
}
const PIE_COLORS = ['#8b5cf6','#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444']

const MoodIcon = ({ mood }: { mood: string }) => {
  if (mood === 'great' || mood === 'good') return <Smile className="w-4 h-4 text-emerald-400" />
  if (mood === 'bad' || mood === 'terrible') return <Frown className="w-4 h-4 text-red-400" />
  return <Meh className="w-4 h-4 text-amber-400" />
}

type WorkFilter = 'all' | 'projects' | 'routines'

export default function ReportsPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [workFilter, setWorkFilter] = useState<WorkFilter>('all')
  const [routineOccurrences, setRoutineOccurrences] = useState<any[]>([])
  const [routines, setRoutines] = useState<any[]>([])

  const fetchData = useCallback(async () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')
    const [{ data: t }, { data: l }, { data: occ }, { data: rout }] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('daily_logs').select('*').gte('date', weekStartStr),
      supabase.from('routine_occurrences').select('*').gte('due_date', weekStartStr),
      supabase.from('routines').select('*'),
    ])
    setTasks(t ?? [])
    setLogs(l ?? [])
    setRoutineOccurrences(occ ?? [])
    setRoutines(rout ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const routineMetrics = useMemo(() => {
    const completed = routineOccurrences.filter(o => o.status === 'completed')
    const delayed   = routineOccurrences.filter(o => o.status === 'delayed')
    const total     = routineOccurrences.length
    const onTimeRate = total > 0 ? Math.round((completed.length / total) * 100) : 0
    const delayRate  = total > 0 ? Math.round((delayed.length / total) * 100) : 0

    const delayCounts: Record<string, number> = {}
    routineOccurrences.filter(o => o.status === 'delayed').forEach(o => {
      delayCounts[o.routine_id] = (delayCounts[o.routine_id] || 0) + 1
    })
    const mostDelayedId = Object.entries(delayCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    const mostDelayed = routines.find(r => r.id === mostDelayedId)

    const sortedByRoutine = [...routineOccurrences].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    let streak = 0
    for (const occ of [...sortedByRoutine].reverse()) {
      if (occ.status === 'completed') streak++
      else break
    }

    return { onTimeRate, delayRate, mostDelayed, streak, completedCount: completed.length }
  }, [routineOccurrences, routines])

  const workDistributionData = useMemo(() => {
    const projectTasks = tasks.filter(t => t.status === 'done' && t.project_id).length
    const routineCompleted = routineOccurrences.filter(o => o.status === 'completed').length
    const total = projectTasks + routineCompleted
    if (total === 0) return []
    return [
      { name: 'Projects', value: projectTasks, pct: Math.round((projectTasks / total) * 100) },
      { name: 'Routines', value: routineCompleted, pct: Math.round((routineCompleted / total) * 100) },
    ]
  }, [tasks, routineOccurrences])

  const report: WeeklyReport = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd   = addDays(weekStart, 6)

    const allWeekTasks = tasks.filter(t => {
      if (!t.due_date) return false
      return isWithinInterval(parseISO(t.due_date), { start: weekStart, end: weekEnd })
    })
    const weekTasks = workFilter === 'routines' ? [] :
      workFilter === 'projects' ? allWeekTasks.filter(t => t.project_id) : allWeekTasks

    const totalMinutes = workFilter === 'routines' ? 0 : weekTasks.reduce((s, t) => s + t.time_spent_minutes, 0)
    const tasksCompleted = workFilter === 'routines'
      ? routineOccurrences.filter(o => o.status === 'completed').length
      : weekTasks.filter(t => t.status === 'done').length

    // Top categories (using habit_category from tasks)
    const catMap: Record<string, number> = {}
    weekTasks.forEach(t => {
      if (t.habit_category) catMap[t.habit_category] = (catMap[t.habit_category] || 0) + 1
    })
    const topCategories = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }))

    // Daily completions
    const dailyCompletions = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const dayTasks = tasks.filter(t => {
        if (!t.due_date) return false
        const d = parseISO(t.due_date)
        return isWithinInterval(d, { start: day, end: addDays(day, 1) })
      })
      return {
        day: format(day, 'EEE'),
        completed: dayTasks.filter(t => t.status === 'done').length,
        total: dayTasks.length,
      }
    })

    // Mood trend
    const moodTrend = logs.map(l => ({
      date: format(parseISO(l.date), 'EEE'),
      mood: l.mood ?? 'okay',
    }))

    return { totalHoursWorked: totalMinutes / 60, tasksCompleted, topCategories, dailyCompletions, moodTrend }
  }, [tasks, logs, workFilter, routineOccurrences])

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        <TopNav title="Reports" subtitle="Weekly analytics" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Hours Worked',     value: report.totalHoursWorked.toFixed(1) + 'h', icon: Clock,        color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Tasks Completed',  value: report.tasksCompleted,                     icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Categories Active',value: report.topCategories.length,               icon: FolderOpen,   color: 'text-blue-400',    bg: 'bg-blue-500/10' },
    { label: 'Logs This Week',   value: logs.length,                               icon: TrendingUp,   color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  ]

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <TopNav title="Reports" subtitle={`Week of ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}`} />
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Work Type Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Work type:</span>
          <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
            {([['all', 'All'], ['projects', 'Projects'], ['routines', 'Routines']] as [WorkFilter, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setWorkFilter(v)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  workFilter === v ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200')}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4">
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

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily completions bar chart */}
          <div className="lg:col-span-2 glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Daily Task Completions</h3>
            <div style={{ width: '100%', height: 192, minHeight: 192, display: 'block' }}>
                <ResponsiveContainer width="100%" height={192}>
                  <BarChart data={report.dailyCompletions} barSize={14} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#e2e8f0' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }}
                    labelStyle={{ color: '#ffffff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#e2e8f0' }} />
                  <Bar dataKey="completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Completed" />
                  <Bar dataKey="total"     fill="#1e293b" radius={[4, 4, 0, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category breakdown pie chart */}
          <div className="glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">By Category</h3>
            {report.topCategories.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-500 dark:text-slate-400 text-sm">
                No categories yet
              </div>
            ) : (
              <div style={{ width: '100%', height: 192, minHeight: 192, display: 'block' }}>
                <ResponsiveContainer width="100%" height={192}>
                  <PieChart>
                    <Pie
                      data={report.topCategories}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {report.topCategories.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: '#e2e8f0', fontSize: '10px' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Work Distribution */}
        {workDistributionData.length > 0 && (
          <div className="glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Work Distribution</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div style={{ width: 160, height: 160, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={workDistributionData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4}>
                      <Cell fill="#8b5cf6" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-3">
                {workDistributionData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: i === 0 ? '#8b5cf6' : '#10b981' }} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.value} completed · {item.pct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Routines-only metrics */}
        {workFilter === 'routines' && (
          <div className="glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Routine Performance</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'On-time rate', value: `${routineMetrics.onTimeRate}%`, color: routineMetrics.onTimeRate >= 80 ? 'text-emerald-400' : routineMetrics.onTimeRate >= 50 ? 'text-amber-400' : 'text-red-400' },
                { label: 'Delay rate', value: `${routineMetrics.delayRate}%`, color: routineMetrics.delayRate <= 10 ? 'text-emerald-400' : routineMetrics.delayRate <= 30 ? 'text-amber-400' : 'text-red-400' },
                { label: 'Completed this week', value: routineMetrics.completedCount, color: 'text-violet-400' },
                { label: 'Current streak', value: `${routineMetrics.streak}×`, color: 'text-blue-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            {routineMetrics.mostDelayed && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-500/20">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-0.5">Most Delayed Routine</p>
                <p className="text-sm text-slate-800 dark:text-slate-200">{routineMetrics.mostDelayed.title}</p>
              </div>
            )}
          </div>
        )}

        {/* Mood trend */}
        {report.moodTrend.length > 0 && (
          <div className="glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Mood This Week</h3>
            <div className="flex gap-4 items-center">
              {report.moodTrend.map(({ date, mood }) => (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  <MoodIcon mood={mood} />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">{date}</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: MOOD_COLORS[mood] ?? '#6b7280' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Professional Report Templates Section */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8 mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              📊 Professional Report Templates
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Export comprehensive reports for presentations and stakeholder meetings
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            <ReportTemplateCard
              icon="📊"
              title="Executive Summary"
              description="High-level KPIs and strategic insights"
              forUseCase="Board meetings, investor updates"
              templatePath="/reports/templates/report1-executive-summary.html"
              dynamicPath="/reports/executive-summary"
            />
            
            <ReportTemplateCard
              icon="🎯"
              title="Project Deep Dive"
              description="Detailed task breakdown with issues & blockers"
              forUseCase="Team standups, sprint reviews"
              templatePath="/reports/templates/report2-project-deep-dive.html"
              dynamicPath="/reports/project-detail"
            />
            
            <ReportTemplateCard
              icon="📅"
              title="Timeline (Monthly)"
              description="12-month Gantt chart roadmap"
              forUseCase="Quarterly planning, stakeholder alignment"
              templatePath="/reports/templates/report3-timeline-monthly.html"
              dynamicPath="/reports/timeline-monthly"
            />
            
            <ReportTemplateCard
              icon="📌"
              title="Timeline (Weekly)"
              description="Daily hourly breakdown with progress"
              forUseCase="Daily reports, sprint tracking"
              templatePath="/reports/templates/report4-timeline-weekly.html"
              dynamicPath="/reports/timeline-weekly"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
