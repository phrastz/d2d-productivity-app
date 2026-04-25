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
import { TrendingUp, CheckCircle2, Clock, Smile, Frown, Meh, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOOD_COLORS: Record<string, string> = {
  great: '#10b981', good: '#6366f1', okay: '#f59e0b', bad: '#f97316', terrible: '#ef4444'
}
const PIE_COLORS = ['#8b5cf6','#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444']

const MoodIcon = ({ mood }: { mood: string }) => {
  if (mood === 'great' || mood === 'good') return <Smile className="w-4 h-4 text-emerald-400" />
  if (mood === 'bad' || mood === 'terrible') return <Frown className="w-4 h-4 text-red-400" />
  return <Meh className="w-4 h-4 text-amber-400" />
}

export default function ReportsPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const [{ data: t }, { data: l }] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('daily_logs').select('*').gte('date', format(weekStart, 'yyyy-MM-dd')),
    ])
    setTasks(t ?? [])
    setLogs(l ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const report: WeeklyReport = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    const weekEnd   = addDays(weekStart, 6)

    const weekTasks = tasks.filter(t => {
      if (!t.due_date) return false
      return isWithinInterval(parseISO(t.due_date), { start: weekStart, end: weekEnd })
    })

    const totalMinutes = weekTasks.reduce((s, t) => s + t.time_spent_minutes, 0)
    const tasksCompleted = weekTasks.filter(t => t.status === 'done').length

    // Top categories
    const catMap: Record<string, number> = {}
    weekTasks.forEach(t => {
      if (t.category) catMap[t.category] = (catMap[t.category] || 0) + 1
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
  }, [tasks, logs])

  if (loading) {
    return (
      <>
        <TopNav title="Reports" subtitle="Weekly analytics" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    )
  }

  const statCards = [
    { label: 'Hours Worked',     value: report.totalHoursWorked.toFixed(1) + 'h', icon: Clock,        color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Tasks Completed',  value: report.tasksCompleted,                     icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Categories Active',value: report.topCategories.length,               icon: FolderOpen,   color: 'text-blue-400',    bg: 'bg-blue-500/10' },
    { label: 'Logs This Week',   value: logs.length,                               icon: TrendingUp,   color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  ]

  return (
    <>
      <TopNav title="Reports" subtitle={`Week of ${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d, yyyy')}`} />
      <div className="p-6 space-y-6 animate-fade-in">

        {/* KPI Cards */}
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

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily completions bar chart */}
          <div className="lg:col-span-2 glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Daily Task Completions</h3>
            <div style={{ width: '100%', height: '192px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.dailyCompletions} barSize={14} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 15%)', borderRadius: '8px', fontSize: '11px' }}
                    labelStyle={{ color: 'hsl(213 31% 91%)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: 'hsl(215 20% 55%)' }} />
                  <Bar dataKey="completed" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Completed" />
                  <Bar dataKey="total"     fill="hsl(222 47% 15%)" radius={[4, 4, 0, 0]} name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category breakdown pie chart */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">By Category</h3>
            {report.topCategories.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No categories yet
              </div>
            ) : (
              <div style={{ width: '100%', height: '192px' }}>
                <ResponsiveContainer width="100%" height="100%">
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
                      contentStyle={{ background: 'hsl(222 47% 9%)', border: '1px solid hsl(222 47% 15%)', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ color: 'hsl(215 20% 65%)', fontSize: '10px' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Mood trend */}
        {report.moodTrend.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Mood This Week</h3>
            <div className="flex gap-4 items-center">
              {report.moodTrend.map(({ date, mood }) => (
                <div key={date} className="flex flex-col items-center gap-1.5">
                  <MoodIcon mood={mood} />
                  <span className="text-[10px] text-muted-foreground">{date}</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: MOOD_COLORS[mood] ?? '#6b7280' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
