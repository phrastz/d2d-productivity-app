'use client'

import { useState, useEffect } from 'react'
import { Task, TaskStatus, TaskPriority } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2 } from 'lucide-react'
import { useRealtimeProjects } from '@/hooks/useRealtimeProjects'
import NotesList from '@/components/shared/NotesList'

interface TaskDialogProps {
  task: Task | null
  defaultStatus?: TaskStatus
  onClose: () => void
  onSaved: (task: Task) => void
  onDeleted?: (id: string) => void
}

const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const statuses: TaskStatus[]     = ['todo', 'in_progress', 'done']

export default function TaskDialog({ task, defaultStatus = 'todo', onClose, onSaved, onDeleted }: TaskDialogProps) {
  const supabase = createClient()
  const { projects } = useRealtimeProjects()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: '',
    due_date: '',
    priority: 'medium' as TaskPriority,
    status: defaultStatus as TaskStatus,
    category: '',
    is_habit: false,
    time_spent_minutes: 0,
  })

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        project_id: task.project_id ?? '',
        due_date: task.due_date ? task.due_date.slice(0, 16) : '',
        priority: task.priority,
        status: task.status,
        category: task.category ?? '',
        is_habit: task.is_habit,
        time_spent_minutes: task.time_spent_minutes,
      })
    }
  }, [task])

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      title: form.title,
      description: form.description || null,
      project_id: form.project_id || null,
      due_date: form.due_date || null,
      priority: form.priority,
      status: form.status,
      category: form.category || null,
      is_habit: form.is_habit,
      time_spent_minutes: Number(form.time_spent_minutes),
    }
    let data: Task | null = null
    if (task) {
      const res = await supabase.from('tasks').update(payload).eq('id', task.id).select().single()
      data = res.data
    } else {
      const res = await supabase.from('tasks').insert({ ...payload, owner_id: user.id }).select().single()
      data = res.data
    }
    setSaving(false)
    if (data) { onSaved(data); onClose() }
  }

  const handleDelete = async () => {
    if (!task) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', task.id)
    setDeleting(false)
    onDeleted?.(task.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass rounded-2xl border border-white/10 p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold gradient-text">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Task title *"
            className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            autoFocus
          />
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Description..."
            rows={2}
            className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Priority</label>
              <div className="flex gap-1.5 flex-wrap">
                {priorities.map(p => (
                  <button
                    key={p}
                    onClick={() => set('priority', p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      form.priority === p
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'bg-secondary/50 border-white/10 text-muted-foreground hover:border-white/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value)}
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                {statuses.map(s => (
                  <option key={s} value={s} className="bg-[#0f1322] text-foreground">{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Project</label>
              <select
                value={form.project_id}
                onChange={e => set('project_id', e.target.value)}
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="" className="bg-[#0f1322] text-foreground">-- No Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="bg-[#0f1322] text-foreground">{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Due Date</label>
              <input
                type="datetime-local"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Category</label>
              <input
                value={form.category}
                onChange={e => set('category', e.target.value)}
                placeholder="e.g. Design, Dev"
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Time Spent (min)</label>
              <input
                type="number"
                min={0}
                value={form.time_spent_minutes}
                onChange={e => set('time_spent_minutes', e.target.value)}
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input
                id="is_habit"
                type="checkbox"
                checked={form.is_habit}
                onChange={e => set('is_habit', e.target.checked)}
                className="w-4 h-4 accent-violet-500"
              />
              <label htmlFor="is_habit" className="text-sm text-foreground">Is a Habit</label>
            </div>
          </div>
          
          {/* Notes Section (only for existing tasks) */}
          {task && (
            <div className="mt-4">
              <NotesList taskId={task.id} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-6">
          {task && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground border border-white/10 hover:bg-secondary transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {task ? 'Update' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}
