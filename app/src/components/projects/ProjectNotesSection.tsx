'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Note } from '@/types'
import { format } from 'date-fns'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type FollowUpStatus = 'pending' | 'in_progress' | 'resolved'
type FilterType = 'all' | FollowUpStatus
type SortOrder = 'newest' | 'oldest'

const statusConfig: Record<FollowUpStatus, { label: string; color: string }> = {
  pending:     { label: 'Pending Follow-up', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  in_progress: { label: 'In Progress',       color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30'   },
  resolved:    { label: 'Resolved',           color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
}

interface ProjectNotesSectionProps {
  projectId: string
}

export default function ProjectNotesSection({ projectId }: ProjectNotesSectionProps) {
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [sort, setSort] = useState<SortOrder>('newest')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionNote, setResolutionNote] = useState('')

  useEffect(() => {
    if (!projectId) {
      console.warn('[ProjectNotesSection] projectId is empty — skipping fetch')
      setLoading(false)
      return
    }
    let mounted = true
    const fetchNotes = async () => {
      setLoading(true)
      console.log('[ProjectNotesSection] fetching for projectId:', projectId)
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      console.log('[ProjectNotesSection] result — rows:', data?.length ?? 'null', 'error:', fetchError)
      if (fetchError) console.error('[ProjectNotesSection] FETCH ERROR', fetchError)
      if (mounted) setNotes((data ?? []) as Note[])
      if (mounted) setLoading(false)
    }
    fetchNotes()

    const channel = supabase
      .channel(`project-notes-followup-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `project_id=eq.${projectId}` },
        (payload) => {
          console.log('[ProjectNotesSection] realtime event:', payload.eventType, payload.new)
          if (payload.eventType === 'INSERT')
            setNotes(prev => [payload.new as Note, ...prev])
          else if (payload.eventType === 'UPDATE')
            setNotes(prev => prev.map(n => n.id === payload.new.id ? payload.new as Note : n))
          else if (payload.eventType === 'DELETE')
            setNotes(prev => prev.filter(n => n.id !== payload.old.id))
        }
      )
      .subscribe((status) => {
        console.log('[ProjectNotesSection] realtime channel status:', status)
      })

    return () => { mounted = false; supabase.removeChannel(channel) }
  }, [projectId])

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { data, error } = await supabase.from('notes').insert({
      content: newNote.trim(),
      project_id: projectId,
      owner_id: user.id,
      // follow_up_status defaults to 'pending' via DB column DEFAULT
    }).select().single()
    if (error) {
      console.error('[ProjectNotesSection] INSERT ERROR', error)
      toast.error(`Failed to save note: ${error.message}`)
    } else if (data) { setNotes(prev => [data as Note, ...prev]); setNewNote('') }
    setSaving(false)
  }

  const updateStatus = async (noteId: string, status: FollowUpStatus, resNote?: string) => {
    setUpdatingId(noteId)
    const payload: Partial<Note> & Record<string, unknown> = { follow_up_status: status }
    if (status === 'resolved') {
      payload.follow_up_date = new Date().toISOString()
      payload.follow_up_note = resNote || null
    }
    const { error } = await supabase.from('notes').update(payload).eq('id', noteId)
    if (error) {
      console.error('[ProjectNotesSection] UPDATE ERROR', error)
      toast.error(`Failed to update status: ${error.message}`)
    } else {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...payload } as Note : n))
      if (status === 'resolved') { setResolvingId(null); setResolutionNote('') }
    }
    setUpdatingId(null)
  }

  const displayed = notes
    .filter(n => filter === 'all' || (n.follow_up_status ?? 'pending') === filter)
    .sort((a, b) =>
      sort === 'newest'
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

  const pendingCount = notes.filter(n => (n.follow_up_status ?? 'pending') === 'pending').length

  return (
    <div className="glass rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Notes & Comments</h3>
          {pendingCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium">
              {pendingCount} pending
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filter + Sort */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
          {(['all', 'pending', 'in_progress', 'resolved'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                filter === f
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortOrder)}
          className="ml-auto text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {/* Notes list */}
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {filter !== 'all'
                ? `No ${filter.replace('_', ' ')} notes.`
                : 'No notes yet. Add the first one below.'}
            </p>
          </div>
        ) : (
          displayed.map(note => {
            const status = (note.follow_up_status ?? 'pending') as FollowUpStatus
            const cfg = statusConfig[status]
            const isResolving = resolvingId === note.id
            return (
              <div
                key={note.id}
                className="bg-white dark:bg-slate-800/30 rounded-xl p-4 border border-slate-200 dark:border-slate-700/50"
              >
                <p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed mb-3">
                  {note.content}
                </p>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {format(new Date(note.created_at), 'dd MMM yyyy, HH:mm')}
                    </span>
                  </div>

                  {!isResolving && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {status !== 'in_progress' && status !== 'resolved' && (
                        <button
                          onClick={() => updateStatus(note.id, 'in_progress')}
                          disabled={updatingId === note.id}
                          className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors disabled:opacity-50"
                        >
                          In Progress
                        </button>
                      )}
                      {status !== 'resolved' && (
                        <button
                          onClick={() => setResolvingId(note.id)}
                          disabled={updatingId === note.id}
                          className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                      {status !== 'pending' && (
                        <button
                          onClick={() => updateStatus(note.id, 'pending')}
                          disabled={updatingId === note.id}
                          className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors disabled:opacity-50"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Inline resolve form */}
                {isResolving && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                    <input
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      placeholder="Resolution note (optional)..."
                      className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 mb-2"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setResolvingId(null); setResolutionNote('') }}
                        className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => updateStatus(note.id, 'resolved', resolutionNote)}
                        disabled={updatingId === note.id}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors disabled:opacity-50"
                      >
                        {updatingId === note.id ? '...' : 'Mark Resolved'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Resolution info */}
                {status === 'resolved' && (note.follow_up_date || note.follow_up_note) && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50">
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">Resolved</span>
                      {note.follow_up_date && ` on ${format(new Date(note.follow_up_date), 'dd MMM yyyy')}`}
                      {note.follow_up_note && `: ${note.follow_up_note}`}
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Add note form */}
      <form onSubmit={handleAddNote} className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700/50">
        <input
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="Add a note, boss comment, or follow-up item..."
          className="flex-1 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
        />
        <button
          type="submit"
          disabled={saving || !newNote.trim()}
          className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center hover:bg-amber-500/30 disabled:opacity-50 transition-all border border-amber-500/30 flex-shrink-0"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  )
}
