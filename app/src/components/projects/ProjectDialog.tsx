'use client'

import { useState } from 'react'
import { Project, ProjectStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2, Trash2 } from 'lucide-react'
import NotesList from '@/components/shared/NotesList'
import { toast } from 'sonner'
import { DatePicker } from '@/components/ui/DatePicker'

interface ProjectDialogProps {
  project: Project | null
  onClose: () => void
  onSaved: (p: Project) => void
  onDeleted?: (id: string) => void
}

const statuses: ProjectStatus[] = ['active', 'completed', 'on_hold', 'archived']

export default function ProjectDialog({ project, onClose, onSaved, onDeleted }: ProjectDialogProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [form, setForm] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    start_date: project?.start_date ?? '',
    end_date: project?.end_date ?? '',
    status: (project?.status ?? 'active') as ProjectStatus,
  })

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      name: form.name,
      description: form.description || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
    }
    let data: Project | null = null
    if (project) {
      const res = await supabase.from('projects').update(payload).eq('id', project.id).select().single()
      data = res.data
    } else {
      const res = await supabase.from('projects').insert({ ...payload, owner_id: user.id }).select().single()
      data = res.data
    }
    setSaving(false)
    if (data) { onSaved(data); onClose() }
  }

  const handleDelete = async () => {
    if (!project) return
    setDeleting(true)
    try {
      await supabase.from('projects').delete().eq('id', project.id)
      toast.success('Project deleted successfully!')
      onDeleted?.(project.id)
      onClose()
    } catch (err) {
      toast.error('Failed to delete project')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 animate-fade-in shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold gradient-text">
            {project ? 'Edit Project' : 'New Project'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="Project name *"
            className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 transition-colors"
            autoFocus
          />
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Description..."
            rows={2}
            className="w-full bg-slate-100 dark:bg-secondary/50 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Start Date</label>
              <DatePicker
                date={form.start_date ? new Date(form.start_date) : undefined}
                onSelect={(date) => set('start_date', date ? date.toISOString().split('T')[0] : '')}
                placeholder="Pick start date"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">End Date</label>
              <DatePicker
                date={form.end_date ? new Date(form.end_date) : undefined}
                onSelect={(date) => set('end_date', date ? date.toISOString().split('T')[0] : '')}
                placeholder="Pick end date"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 dark:text-muted-foreground mb-1.5 block">Status</label>
            <div className="flex gap-2 flex-wrap">
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => set('status', s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.status === s
                      ? 'bg-violet-100 dark:bg-primary/20 border-violet-500/50 dark:border-primary/50 text-violet-700 dark:text-primary'
                      : 'bg-slate-100 dark:bg-secondary/50 border-slate-300 dark:border-white/10 text-slate-600 dark:text-muted-foreground'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          {/* Notes Section (only for existing projects) */}
          {project && (
            <div className="mt-4">
              <NotesList projectId={project.id} />
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          {project && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/20 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm text-slate-600 dark:text-muted-foreground border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-violet-500 dark:bg-primary text-white hover:bg-violet-600 dark:hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {project ? 'Update' : 'Create'}
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Delete Project?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                This action cannot be undone. This will permanently delete the project &quot;{project?.name}&quot; and all its sub-projects and tasks.
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
