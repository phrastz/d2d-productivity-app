'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'

interface AddTaskFormProps {
  projectId: string
  subProjectId: string | null   // null = direct task
  onCreated: () => void
  onCancel: () => void
}

const INPUT_CLASS =
  'w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-white/10 text-slate-100 ' +
  'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50'

const DATE_CLASS = INPUT_CLASS + ' [color-scheme:dark]'

export default function AddTaskForm({
  projectId,
  subProjectId,
  onCreated,
  onCancel,
}: AddTaskFormProps) {
  const { createTask } = useTasks()

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    if (startDate && endDate && endDate < startDate) {
      setError('End Date tidak boleh lebih kecil dari Start Date.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createTask({
        title,
        project_id: projectId,
        sub_project_id: subProjectId,
        start_date: startDate || null,
        end_date: endDate || null,
        progress_percent: 0,
        status: 'todo',
      })
      onCreated()
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat task.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-3 rounded-xl bg-slate-900/60 border border-violet-500/20 space-y-3"
    >
      {/* Task Name */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task name..."
        className={INPUT_CLASS}
        autoFocus
      />

      {/* Dates — 2 col grid */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-400 mb-1 font-medium uppercase tracking-wide">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={DATE_CLASS}
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 mb-1 font-medium uppercase tracking-wide">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className={DATE_CLASS}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim() || saving}
          className="flex-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {saving ? 'Saving...' : 'Add Task'}
        </button>
      </div>
    </form>
  )
}
