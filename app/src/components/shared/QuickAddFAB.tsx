'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, CheckSquare, BookOpen, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

type QuickMode = 'task' | 'log' | null

export default function QuickAddFAB() {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<QuickMode>(null)
  const [saving, setSaving] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [logText, setLogText] = useState('')
  const [mood, setMood] = useState('okay')

  const moods = ['great', 'good', 'okay', 'bad', 'terrible']
  const moodEmoji: Record<string, string> = {
    great: '😄', good: '🙂', okay: '😐', bad: '😕', terrible: '😞'
  }

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('tasks').insert({
        title: taskTitle, status: 'todo', priority: 'medium', owner_id: user.id
      })
    }
    setSaving(false)
    setTaskTitle('')
    setOpen(false)
    setMode(null)
  }

  const handleSaveLog = async () => {
    if (!logText.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('daily_logs').upsert({
        user_id: user.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        summary: logText,
        mood,
      }, { onConflict: 'user_id,date' })
    }
    setSaving(false)
    setLogText('')
    setOpen(false)
    setMode(null)
  }

  const close = () => { setOpen(false); setMode(null); setTaskTitle(''); setLogText('') }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={close} />
      )}

      {/* Quick panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 glass rounded-2xl border border-white/10 p-4 animate-fade-in shadow-2xl">
          {!mode ? (
            <>
              <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">Quick Add</p>
              <div className="space-y-2">
                <button
                  onClick={() => setMode('task')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <CheckSquare className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">New Task</p>
                    <p className="text-xs text-muted-foreground">Add to your board</p>
                  </div>
                </button>
                <button
                  onClick={() => setMode('log')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Daily Log</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(), 'EEE, MMM d')}</p>
                  </div>
                </button>
              </div>
            </>
          ) : mode === 'task' ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold gradient-text">Quick Task</p>
                <button onClick={() => setMode(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTask()}
                placeholder="What needs to be done?"
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors mb-3"
                autoFocus
              />
              <button
                onClick={handleSaveTask}
                disabled={saving || !taskTitle.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Task
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold gradient-text">Today&apos;s Log</p>
                <button onClick={() => setMode(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={logText}
                onChange={e => setLogText(e.target.value)}
                placeholder="What did you accomplish today?"
                rows={3}
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none mb-3"
                autoFocus
              />
              <div className="flex gap-2 mb-3">
                {moods.map(m => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    title={m}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-lg transition-all',
                      mood === m ? 'bg-primary/20 scale-110 ring-1 ring-primary/30' : 'hover:bg-secondary/60'
                    )}
                  >
                    {moodEmoji[m]}
                  </button>
                ))}
              </div>
              <button
                onClick={handleSaveLog}
                disabled={saving || !logText.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Log
              </button>
            </>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fab"
        aria-label="Quick add"
      >
        <span className={cn('transition-transform duration-300', open && 'rotate-45')}>
          <Plus className="w-6 h-6" />
        </span>
      </button>
    </>
  )
}
