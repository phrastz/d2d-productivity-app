'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DailyLog } from '@/types'
import TopNav from '@/components/layout/TopNav'
import { format, parseISO } from 'date-fns'
import { BookOpen, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const moodEmoji: Record<string, string> = {
  great: '😄', good: '🙂', okay: '😐', bad: '😕', terrible: '😞'
}
const moodColors: Record<string, string> = {
  great: 'text-emerald-400 bg-emerald-500/10',
  good:  'text-blue-400   bg-blue-500/10',
  okay:  'text-amber-400  bg-amber-500/10',
  bad:   'text-orange-400 bg-orange-500/10',
  terrible: 'text-red-400 bg-red-500/10',
}

export default function DailyLogPage() {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<DailyLog | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [summary, setSummary] = useState('')
  const [mood, setMood] = useState('okay')
  const [saving, setSaving] = useState(false)

  const moods = ['great', 'good', 'okay', 'bad', 'terrible']

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) console.error('[DailyLog] fetchLogs error:', error)
    setLogs(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  useEffect(() => {
    const channel = supabase
      .channel('daily-log-page-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as DailyLog
            setLogs(prev => {
              if (prev.some(l => l.id === inserted.id)) {
                return prev.map(l => l.id === inserted.id ? inserted : l)
              }
              return [inserted, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            setLogs(prev => {
              if (prev.some(l => l.id === payload.new.id)) {
                return prev.map(l => l.id === payload.new.id ? payload.new as DailyLog : l)
              }
              return [payload.new as DailyLog, ...prev]
            })
          } else if (payload.eventType === 'DELETE') {
            setLogs(prev => prev.filter(l => l.id !== (payload.old as DailyLog).id))
          }
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase])

  const today = format(new Date(), 'yyyy-MM-dd')

  const openNew = () => {
    setEditing(null)
    setSummary('')
    setMood('okay')
    setShowForm(true)
  }

  const openEdit = (log: DailyLog) => {
    setEditing(log)
    setSummary(log.summary ?? '')
    setMood(log.mood ?? 'okay')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!summary.trim()) return
    setSaving(true)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      toast.error('You must be signed in to save a log.')
      setSaving(false)
      return
    }
    if (editing) {
      const { data, error } = await supabase
        .from('daily_logs')
        .update({ summary, mood })
        .eq('id', editing.id)
        .select()
        .single()
      if (error) {
        console.error('[DailyLog] update error:', error)
        toast.error(`Failed to update log: ${error.message}`)
      } else if (data) {
        setLogs(prev => prev.map(l => l.id === data.id ? data as DailyLog : l))
        toast.success('Log updated!')
        setShowForm(false)
        setEditing(null)
      }
    } else {
      const { data, error } = await supabase
        .from('daily_logs')
        .insert({ owner_id: user.id, date: today, summary, mood })
        .select()
        .single()
      if (error) {
        console.error('[DailyLog] insert error:', error)
        toast.error(`Failed to save log: ${error.message}`)
      } else if (data) {
        setLogs(prev => [data as DailyLog, ...prev])
        toast.success('Log saved!')
        setShowForm(false)
      }
    }
    setSaving(false)
  }

  const grouped: Record<string, DailyLog[]> = {}
  for (const log of logs) {
    if (!grouped[log.date]) grouped[log.date] = []
    grouped[log.date].push(log)
  }
  const sortedDates = Object.keys(grouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        <TopNav title="Daily Log" subtitle="Journal your day" />
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen">
      <TopNav title="Daily Log" subtitle="Track your mood and daily reflections" />
      <div className="p-6 space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" />
            New Log
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="glass bg-white dark:bg-slate-900/90 border border-violet-200 dark:border-violet-500/20 rounded-2xl p-5 animate-fade-in">
            <p className="text-sm font-semibold gradient-text mb-4">
              {editing
                ? `Editing: ${format(parseISO(editing.date), 'EEEE, d MMMM yyyy')} at ${format(parseISO(editing.created_at), 'HH:mm')}`
                : `New log — ${format(new Date(), 'EEEE, d MMMM yyyy')}`}
            </p>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="What did you work on? How was your day?"
              rows={4}
              className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 resize-none mb-4"
              autoFocus
            />
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-slate-500 dark:text-slate-400">Mood:</span>
              {moods.map(m => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  title={m}
                  className={cn(
                    'text-xl transition-all',
                    mood === m ? 'scale-125' : 'opacity-40 hover:opacity-70'
                  )}
                >
                  {moodEmoji[m]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowForm(false); setEditing(null) }}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !summary.trim()}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-violet-700 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Log
              </button>
            </div>
          </div>
        )}

        {/* Log entries grouped by date */}
        <div className="space-y-6">
          {sortedDates.length === 0 ? (
            <div className="glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No logs yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Start journaling your day!</p>
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {format(parseISO(date), 'EEEE, d MMMM yyyy')}
                  </p>
                  {date === today && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 font-semibold tracking-wide">
                      TODAY
                    </span>
                  )}
                </div>
                {grouped[date].map(log => (
                  <button
                    key={log.id}
                    onClick={() => openEdit(log)}
                    className={cn(
                      'w-full glass bg-white dark:bg-slate-900/90 border rounded-2xl p-4 text-left hover:glow transition-all duration-200 group',
                      date === today
                        ? 'border-violet-300 dark:border-violet-500/40'
                        : 'border-slate-200 dark:border-slate-800'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-violet-400" />
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {format(parseISO(log.created_at), 'HH:mm')}
                        </p>
                      </div>
                      {log.mood && (
                        <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', moodColors[log.mood])}>
                          {moodEmoji[log.mood]} {log.mood}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                      {log.summary}
                    </p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
