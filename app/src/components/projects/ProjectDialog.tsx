'use client'

import { useState } from 'react'
import { Project, ProjectStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { X, Loader2 } from 'lucide-react'

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
    await supabase.from('projects').delete().eq('id', project.id)
    onDeleted?.(project.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md glass rounded-2xl border border-white/10 p-6 animate-fade-in">
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
            className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            autoFocus
          />
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Description..."
            rows={2}
            className="w-full bg-secondary/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full bg-secondary/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Status</label>
            <div className="flex gap-2 flex-wrap">
              {statuses.map(s => (
                <button
                  key={s}
                  onClick={() => set('status', s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.status === s
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-secondary/50 border-white/10 text-muted-foreground'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          {project && (
            <button
              onClick={handleDelete}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
            >
              Delete
            </button>
          )}
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm text-muted-foreground border border-white/10 hover:bg-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {project ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}
