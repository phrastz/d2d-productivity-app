'use client'

import { useState, useEffect } from 'react'
import { Note } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, Send } from 'lucide-react'

interface NotesListProps {
  projectId?: string
  taskId?: string
}

export default function NotesList({ projectId, taskId }: NotesListProps) {
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true)
      let query = supabase.from('notes').select('*').order('created_at', { ascending: true })
      
      if (projectId) query = query.eq('project_id', projectId)
      if (taskId) query = query.eq('task_id', taskId)
      
      const { data } = await query
      if (data) setNotes(data as Note[])
      setLoading(false)
    }

    if (projectId || taskId) {
      fetchNotes()
      
      // Subscribe to real-time changes
      const channelName = taskId ? `notes-task-${taskId}` : `notes-project-${projectId}`
      const filter = taskId ? `task_id=eq.${taskId}` : `project_id=eq.${projectId}`
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
            filter: filter
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setNotes(prev => [...prev, payload.new as Note])
            } else if (payload.eventType === 'DELETE') {
              setNotes(prev => prev.filter(n => n.id !== payload.old.id))
            } else if (payload.eventType === 'UPDATE') {
              setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new as Note : n))
            }
          }
        )
        .subscribe()
      
      return () => {
        supabase.removeChannel(channel)
      }
    } else {
      setLoading(false)
    }
  }, [projectId, taskId, supabase])

  const handleAddNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newNote.trim()) return

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload = {
      content: newNote.trim(),
      project_id: projectId || null,
      task_id: taskId || null,
      owner_id: user.id
    }

    const { data } = await supabase.from('notes').insert(payload).select().single()
    if (data) {
      setNotes(prev => [...prev, data as Note])
      setNewNote('')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full bg-slate-100 dark:bg-secondary/20 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-white dark:bg-secondary/30">
        <h3 className="text-xs font-bold text-slate-600 dark:text-muted-foreground uppercase tracking-wider">Notes & Comments</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-center">
            <p className="text-xs text-slate-500 dark:text-muted-foreground">No notes yet. Add a comment below to track progress or blockers.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-white dark:glass rounded-xl p-3 animate-fade-in text-sm border border-slate-200 dark:border-white/5">
              <p className="text-slate-900 dark:text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
              <div className="mt-2 text-[10px] text-slate-500 dark:text-muted-foreground text-right">
                {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddNote} className="p-3 border-t border-slate-200 dark:border-white/5 bg-white dark:bg-secondary/30 flex gap-2">
        <input
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note or boss's comment..."
          className="flex-1 bg-white dark:bg-black/20 border border-slate-300 dark:border-white/5 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-foreground placeholder:text-slate-500 dark:placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={saving || !newNote.trim()}
          className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5" />}
        </button>
      </form>
    </div>
  )
}
