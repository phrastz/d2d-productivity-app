'use client'

import { useState, useEffect } from 'react'
import { Task, TaskStatus, TaskPriority, SubProject } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { DatePicker } from '@/components/ui/DatePicker'
import { useRealtimeProjects } from '@/hooks/useRealtimeProjects'
import NotesList from '@/components/shared/NotesList'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TaskDialogProps {
  task: Task | null
  defaultStatus?: TaskStatus
  onClose: () => void
  onSaved: (task: Task) => void
  onDeleted?: (id: string) => void
}

const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']
const statuses: TaskStatus[]     = ['todo', 'in_progress', 'done', 'cancelled']

export default function TaskDialog({ task, defaultStatus = 'todo', onClose, onSaved, onDeleted }: TaskDialogProps) {
  const supabase = createClient()
  const { projects } = useRealtimeProjects()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    project_id: '',
    sub_project_id: '',
    due_date: '',
    priority: 'medium' as TaskPriority,
    status: defaultStatus as TaskStatus,
    category: '',
    is_habit: false,
    time_spent_minutes: 0,
    effort_estimate: 0,
    actual_effort: 0,
    effort_unit: 'hours' as 'hours' | 'days' | 'story_points',
    planned_completed_date: '',
    actual_completed_date: '',
    backdate_reason: '',
    is_blocked: false,
    blocker_reason: '',
  })
  const [subProjects, setSubProjects] = useState<SubProject[]>([])
  const [loadingSubProjects, setLoadingSubProjects] = useState(false)

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title ?? '',
        description: task.description ?? '',
        project_id: task.project_id ?? '',
        sub_project_id: task.sub_project_id ?? '',
        due_date: task.due_date ? task.due_date.slice(0, 16) : '',
        priority: task.priority ?? 'medium',
        status: task.status ?? defaultStatus,
        category: task.habit_category ?? '',
        is_habit: task.is_habit ?? false,
        time_spent_minutes: task.time_spent_minutes ?? 0,
        effort_estimate: task.effort_estimate ?? 0,
        actual_effort: task.actual_effort ?? 0,
        effort_unit: task.effort_unit ?? 'hours',
        planned_completed_date: task.planned_completed_date ?? '',
        actual_completed_date: task.actual_completed_date ?? '',
        backdate_reason: task.backdate_reason ?? '',
        is_blocked: task.is_blocked ?? false,
        blocker_reason: task.blocker_reason ?? '',
      })
    }
  }, [task])

  // Fetch sub-projects when project is selected
  useEffect(() => {
    if (!form.project_id) {
      setSubProjects([])
      return
    }

    const fetchSubProjects = async () => {
      setLoadingSubProjects(true)
      try {
        const { data, error } = await supabase
          .from('sub_projects')
          .select('*')
          .eq('project_id', form.project_id)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching sub-projects:', error)
        } else {
          setSubProjects(data || [])
        }
      } catch (err) {
        console.error('Exception fetching sub-projects:', err)
      } finally {
        setLoadingSubProjects(false)
      }
    }

    fetchSubProjects()
  }, [form.project_id, supabase])

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
      sub_project_id: form.sub_project_id || null,
      due_date: form.due_date || null,
      priority: form.priority,
      status: form.status,
      category: form.category || null,
      is_habit: form.is_habit,
      time_spent_minutes: Number(form.time_spent_minutes),
      effort_estimate: Number(form.effort_estimate),
      actual_effort: Number(form.actual_effort),
      effort_unit: form.effort_unit,
      planned_completed_date: form.planned_completed_date || null,
      actual_completed_date: form.actual_completed_date || null,
      backdate_reason: form.backdate_reason || null,
      is_blocked: form.is_blocked,
      blocker_reason: form.blocker_reason || null,
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
    if (data) {
      toast.success(task ? 'Task updated successfully!' : 'Task created successfully!', {
        description: `"${data.title}" has been saved`
      })
      onSaved(data)
      onClose()
    }
  }

  const handleDelete = async () => {
    if (!task) return
    setDeleting(true)
    try {
      await supabase.from('tasks').delete().eq('id', task.id)
      toast.success('Task deleted successfully!')
      onDeleted?.(task.id)
      onClose()
    } catch (err) {
      toast.error('Failed to delete task')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 animate-fade-in shadow-2xl flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-base font-semibold gradient-text">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <input
            value={form.title ?? ''}
            onChange={e => set('title', e.target.value)}
            placeholder="Task title *"
            className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 transition-colors"
            autoFocus
          />
          <textarea
            value={form.description ?? ''}
            onChange={e => set('description', e.target.value)}
            placeholder="Description..."
            rows={2}
            className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Priority</label>
              <div className="flex gap-1.5 flex-wrap">
                {priorities.map(p => (
                  <button
                    key={p}
                    onClick={() => set('priority', p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      form.priority === p
                        ? 'bg-violet-100 dark:bg-primary/20 border-violet-500/50 dark:border-primary/50 text-violet-700 dark:text-primary'
                        : 'bg-slate-100 dark:bg-secondary/50 border-slate-300 dark:border-white/10 text-slate-600 dark:text-muted-foreground hover:border-slate-400 dark:hover:border-white/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Status</label>
              <select
                value={form.status ?? 'todo'}
                onChange={e => set('status', e.target.value)}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50"
              >
                {statuses.map(s => (
                  <option key={s} value={s} className="bg-white dark:bg-[#0f1322] text-slate-900 dark:text-foreground">{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Project</label>
              <select
                value={form.project_id ?? ''}
                onChange={e => {
                  set('project_id', e.target.value)
                  set('sub_project_id', '') // Reset sub-project when project changes
                }}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50"
              >
                <option value="" className="bg-white dark:bg-[#0f1322] text-slate-900 dark:text-foreground">-- No Project --</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-[#0f1322] text-slate-900 dark:text-foreground">{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Due Date</label>
              <input
                type="datetime-local"
                value={form.due_date ?? ''}
                onChange={e => set('due_date', e.target.value)}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Sub-Project selector - only show if project is selected */}
          {form.project_id && (
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Sub-Project (Optional)</label>
              <select
                value={form.sub_project_id ?? ''}
                onChange={e => set('sub_project_id', e.target.value)}
                disabled={loadingSubProjects}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
              >
                <option value="" className="bg-white dark:bg-[#0f1322] text-slate-900 dark:text-foreground">
                  {loadingSubProjects ? 'Loading...' : '-- No Sub-Project --'}
                </option>
                {subProjects.map(sp => (
                  <option key={sp.id} value={sp.id} className="bg-white dark:bg-[#0f1322] text-slate-900 dark:text-foreground">{sp.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Category</label>
              <input
                value={form.category ?? ''}
                onChange={e => set('category', e.target.value)}
                placeholder="e.g. Design, Dev"
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Time Spent (min)</label>
              <input
                type="number"
                min={0}
                value={form.time_spent_minutes ?? 0}
                onChange={e => set('time_spent_minutes', e.target.value)}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input
                id="is_habit"
                type="checkbox"
                checked={form.is_habit ?? false}
                onChange={e => set('is_habit', e.target.checked)}
                className="w-4 h-4 accent-violet-500"
              />
              <label htmlFor="is_habit" className="text-sm text-slate-700 dark:text-foreground">Is a Habit</label>
            </div>
          </div>

          {/* Planned Completion Date */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <h4 className="text-xs font-medium text-slate-600 dark:text-muted-foreground uppercase tracking-wide">
              Date Planning
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Planned Completion</label>
                <DatePicker
                  date={form.planned_completed_date ? new Date(form.planned_completed_date) : undefined}
                  onSelect={(date) => set('planned_completed_date', date ? date.toISOString().split('T')[0] : '')}
                  placeholder="Target deadline"
                />
              </div>
              {(form.status === 'done' || task?.actual_completed_date) && (
                <div>
                  <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Actual Completion</label>
                  <DatePicker
                    date={form.actual_completed_date ? new Date(form.actual_completed_date) : undefined}
                    onSelect={(date) => set('actual_completed_date', date ? date.toISOString().split('T')[0] : '')}
                    placeholder="When done?"
                  />
                  {/* Backdate warning */}
                  {form.actual_completed_date && new Date(form.actual_completed_date) < new Date(new Date().setHours(0,0,0,0)) && (
                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      Backdated entry - will be flagged for audit
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Backdate reason (if flagged) */}
            {task?.is_backdated_entry && (
              <div>
                <label className="text-xs text-amber-600 dark:text-amber-400 mb-1.5 block">Backdate Reason (Optional)</label>
                <textarea
                  value={form.backdate_reason ?? ''}
                  onChange={e => set('backdate_reason', e.target.value)}
                  placeholder="Why was this completed date not recorded on time?"
                  rows={2}
                  className="w-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            )}
          </div>

          {/* Blocker Tracking Section */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <h4 className="text-xs font-medium text-slate-600 dark:text-muted-foreground uppercase tracking-wide">
              Blocker Status
            </h4>
            <div className="flex items-center gap-2">
              <input
                id="is_blocked"
                type="checkbox"
                checked={form.is_blocked ?? false}
                onChange={e => set('is_blocked', e.target.checked)}
                className="w-4 h-4 accent-violet-500"
              />
              <label htmlFor="is_blocked" className="text-sm text-slate-700 dark:text-foreground">This task is blocked</label>
            </div>
            {form.is_blocked && (
              <div>
                <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Blocker Reason</label>
                <input
                  value={form.blocker_reason ?? ''}
                  onChange={e => set('blocker_reason', e.target.value)}
                  placeholder="What is blocking this task?"
                  className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50"
                />
              </div>
            )}
          </div>

          {/* Effort Tracking Section */}
          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <h4 className="text-xs font-medium text-slate-600 dark:text-muted-foreground uppercase tracking-wide">
              Effort Tracking
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Estimated Effort</label>
                <input
                  type="number"
                  min={0}
                  value={form.effort_estimate || ''}
                  onChange={e => set('effort_estimate', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50"
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Actual Effort</label>
                <input
                  type="number"
                  min={0}
                  value={form.actual_effort || ''}
                  onChange={e => set('actual_effort', e.target.value === '' ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
            
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Effort Unit</label>
              <select
                value={form.effort_unit}
                onChange={e => set('effort_unit', e.target.value)}
                className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground focus:outline-none focus:border-violet-500/50"
              >
                <option value="hours" className="bg-white dark:bg-[#0f1322] text-slate-900 dark:text-foreground">Hours</option>
                <option value="days" className="bg-white dark:bg-[#0f1322] text-slate-900 dark:text-foreground">Days</option>
                <option value="story_points" className="bg-white dark:bg-[#0f1322] text-slate-900 dark:text-foreground">Story Points</option>
              </select>
            </div>
            
            {/* Efficiency Indicator */}
            {form.effort_estimate > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-muted-foreground">Efficiency:</span>
                <span className={cn(
                  "font-medium",
                  form.actual_effort === 0 ? "text-slate-500 dark:text-slate-400" :
                  form.actual_effort <= form.effort_estimate * 0.9 ? "text-green-600 dark:text-green-400" :
                  form.actual_effort <= form.effort_estimate * 1.1 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-red-600 dark:text-red-400"
                )}>
                  {form.actual_effort > 0 
                    ? `${Math.round((form.actual_effort / form.effort_estimate) * 100)}%` 
                    : 'Not started'
                  }
                </span>
              </div>
            )}
          </div>
          
          {/* Notes Section (only for existing tasks) */}
          {task && (
            <div className="mt-4">
              <NotesList taskId={task.id} />
            </div>
          )}
        </div>

        {/* Sticky Footer Actions */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 z-10">
          {task && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-muted-foreground border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-secondary transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-violet-500 dark:bg-primary text-white hover:bg-violet-600 dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {task ? 'Update' : 'Create Task'}
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete Task?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                This action cannot be undone. This will permanently delete the task &quot;{task?.title}&quot;.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-muted-foreground border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-secondary transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
