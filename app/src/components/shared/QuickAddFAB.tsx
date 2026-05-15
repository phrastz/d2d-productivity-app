'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, CheckSquare, BookOpen, Loader2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { useRealtimeProjects } from '@/hooks/useRealtimeProjects'
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks'
import type { SubProject } from '@/types'

type QuickMode = 'task' | 'log' | 'note' | null

export default function QuickAddFAB() {
  const supabase = createClient()
  const { projects } = useRealtimeProjects()
  const { tasks } = useRealtimeTasks()
  
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<QuickMode>(null)
  const [saving, setSaving] = useState(false)
  
  const [taskTitle, setTaskTitle] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  
  const [logText, setLogText] = useState('')
  const [mood, setMood] = useState('okay')
  
  const [noteText, setNoteText] = useState('')
  const [noteProjectId, setNoteProjectId] = useState<string>('')
  const [noteTaskId, setNoteTaskId] = useState<string>('')
  const [taskSubProjectId, setTaskSubProjectId] = useState<string>('')
  const [taskSubProjects, setTaskSubProjects] = useState<SubProject[]>([])

  useEffect(() => {
    if (!projectId) { setTaskSubProjects([]); setTaskSubProjectId(''); return }
    supabase
      .from('sub_projects')
      .select('id, name, order_index, status, priority, description, project_id, owner_id, created_at, updated_at, progress_percent, weight_contribution, start_date, end_date')
      .eq('project_id', projectId)
      .order('order_index')
      .then(({ data }) => { setTaskSubProjects(data || []); setTaskSubProjectId('') })
  }, [projectId, supabase])

  useEffect(() => { setNoteTaskId('') }, [noteProjectId])

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
        title: taskTitle, 
        status: 'todo', 
        priority: 'medium', 
        owner_id: user.id,
        project_id: projectId || null,
        sub_project_id: taskSubProjectId || null
      })
    }
    setSaving(false)
    setTaskTitle('')
    setProjectId('')
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

  const handleSaveNote = async () => {
    if (!noteText.trim()) return
    setSaving(true)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      toast.error('You must be signed in to add a note.')
      setSaving(false)
      return
    }
    const { data, error } = await supabase.from('notes').insert({
      content: noteText.trim(),
      owner_id: user.id,
      project_id: noteProjectId || null,
      task_id: noteTaskId || null
    }).select().single()
    if (error) {
      console.error('[QuickAddFAB] Note insert error:', error)
      toast.error(`Failed to save note: ${error.message}`)
    } else {
      toast.success('Note saved!')
    }
    setSaving(false)
    setNoteText('')
    setNoteProjectId('')
    setNoteTaskId('')
    setOpen(false)
    setMode(null)
  }

  const close = () => { 
    setOpen(false)
    setMode(null)
    setTaskTitle('')
    setLogText('')
    setProjectId('')
    setNoteText('')
    setNoteProjectId('')
    setNoteTaskId('')
    setTaskSubProjectId('')
    setTaskSubProjects([])
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={close} />
      )}

      {/* Quick panel */}
      {open && (
        <div className="fixed bottom-[130px] md:bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-32px)] md:w-80 glass rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 p-4 animate-fade-in shadow-2xl">
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
                  onClick={() => setMode('note')}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Add Note / Comment</p>
                    <p className="text-xs text-muted-foreground">Attach to a task or project</p>
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
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 transition-colors mb-2"
                autoFocus
              />
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50 transition-colors mb-2"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-foreground">No Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-foreground">{p.name}</option>
                ))}
              </select>
              {projectId && taskSubProjects.length > 0 && (
                <select
                  value={taskSubProjectId}
                  onChange={e => setTaskSubProjectId(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50 transition-colors mb-2"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-foreground">No Sub-Project</option>
                  {taskSubProjects.map(sp => (
                    <option key={sp.id} value={sp.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-foreground">{sp.name}</option>
                  ))}
                </select>
              )}
              <div className="mb-3" />
              <button
                onClick={handleSaveTask}
                disabled={saving || !taskTitle.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Task
              </button>
            </>
          ) : mode === 'note' ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold gradient-text">New Note / Comment</p>
                <button onClick={() => setMode(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write a note, boss's comment, or blocker..."
                rows={3}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 resize-none mb-2"
                autoFocus
              />
              <select
                value={noteProjectId}
                onChange={e => setNoteProjectId(e.target.value)}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50 transition-colors mb-2"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-foreground">-- Attach to Project (Optional) --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-foreground">{p.name}</option>
                ))}
              </select>
              <select
                value={noteTaskId}
                onChange={e => setNoteTaskId(e.target.value)}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50 transition-colors mb-3"
              >
                <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-foreground">-- Attach to Task (Optional) --</option>
                {(noteProjectId ? tasks.filter(t => t.project_id === noteProjectId) : tasks).map(t => (
                  <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-foreground">
                    {t.title}{!noteProjectId && t.project_id ? ` (${projects.find(p => p.id === t.project_id)?.name})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveNote}
                disabled={saving || !noteText.trim()}
                className="w-full py-2.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500/30 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Note
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
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 resize-none mb-3"
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
