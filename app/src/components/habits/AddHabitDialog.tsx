'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface AddHabitDialogProps {
  open: boolean
  onClose: () => void
}

const CATEGORIES = ['Health', 'Learning', 'Work', 'Personal']

export default function AddHabitDialog({ open, onClose }: AddHabitDialogProps) {
  const supabase = createClient()
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Personal')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (!userId) {
        alert('Not authenticated')
        return
      }

      const { error } = await supabase.from('tasks').insert({
        owner_id: userId,
        title: name.trim(),
        description: description.trim() || null,
        is_habit: true,
        habit_category: category,
        status: 'todo',
        priority: 'medium',
        time_spent_minutes: 0,
      })

      if (error) throw error

      // Reset form and close
      setName('')
      setDescription('')
      setCategory('Personal')
      onClose()
    } catch (err) {
      console.error('Error creating habit:', err)
      alert('Failed to create habit')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative glass rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">Add New Habit</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Habit Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning Exercise, Read 30 minutes"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
              required
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    category === cat
                      ? 'bg-violet-500/30 text-violet-400 border-2 border-violet-500/50'
                      : 'bg-slate-800/30 text-muted-foreground border-2 border-transparent hover:bg-slate-800/50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any notes or details..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800/70 text-foreground font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
