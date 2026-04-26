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
    <div className="flex flex-col h-full bg-secondary/20 rounded-2xl border border-white/5 overflow-hidden">
      <div className="p-4 border-b border-white/5 bg-secondary/30">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes & Comments</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-center">
            <p className="text-xs text-muted-foreground">No notes yet. Add a comment below to track progress or blockers.</p>
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="glass rounded-xl p-3 animate-fade-in text-sm border-white/5">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
              <div className="mt-2 text-[10px] text-muted-foreground text-right">
                {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleAddNote} className="p-3 border-t border-white/5 bg-secondary/30 flex gap-2">
        <input
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note or boss's comment..."
          className="flex-1 bg-black/20 border border-white/5 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
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
