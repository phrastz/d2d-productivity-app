'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DailyLog } from '@/types'
import TopNav from '@/components/layout/TopNav'
import { format, parseISO } from 'date-fns'
import { BookOpen, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const supabase = createClient()
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<DailyLog | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [summary, setSummary] = useState('')
  const [mood, setMood] = useState('okay')
  const [saving, setSaving] = useState(false)

  const moods = ['great', 'good', 'okay', 'bad', 'terrible']

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from('daily_logs')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)
    setLogs(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

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
    const today = format(new Date(), 'yyyy-MM-dd')
    if (editing) {
      const { data } = await supabase.from('daily_logs').update({ summary, mood }).eq('id', editing.id).select().single()
      if (data) setLogs(prev => prev.map(l => l.id === data.id ? data : l))
    } else {
      const { data } = await supabase.from('daily_logs').upsert({ date: today, summary, mood }, { onConflict: 'user_id,date' }).select().single()
      if (data) setLogs(prev => [data, ...prev.filter(l => l.date !== data.date)])
    }
    setSaving(false)
    setShowForm(false)
  }

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
            Today&apos;s Log
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="glass bg-white dark:bg-slate-900/90 border border-violet-200 dark:border-violet-500/20 rounded-2xl p-5 animate-fade-in">
            <p className="text-sm font-semibold gradient-text mb-4">
              {editing ? `Edit: ${editing.date}` : `Today — ${format(new Date(), 'EEEE, d MMMM yyyy')}`}
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
                onClick={() => setShowForm(false)}
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

        {/* Log entries */}
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No logs yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Start journaling your day!</p>
            </div>
          ) : (
            logs.map(log => (
              <button
                key={log.id}
                onClick={() => openEdit(log)}
                className="w-full glass bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-left hover:glow transition-all duration-200 group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {format(parseISO(log.date), 'EEEE, d MMMM yyyy')}
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
            ))
          )}
        </div>
      </div>
    </div>
  )
}
