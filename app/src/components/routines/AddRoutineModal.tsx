'use client'

import { useState } from 'react'
import { Routine, RoutineFrequency, RoutineStatus } from '@/types'
import { X, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface AddRoutineModalProps {
  onClose: () => void
  onSave: (payload: Omit<Routine, 'id' | 'owner_id' | 'created_at' | 'updated_at'>, checklistLabels: string[]) => Promise<unknown>
  initial?: Partial<Routine>
}

const DAY_OPTIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CATEGORY_SUGGESTIONS = ['Marketing', 'Reporting', 'Admin', 'Operations', 'Finance', 'HR', 'Sales', 'Tech']

export default function AddRoutineModal({ onClose, onSave, initial }: AddRoutineModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [frequencyType, setFrequencyType] = useState<RoutineFrequency>(initial?.frequency_type ?? 'weekly')
  const [frequencyInterval, setFrequencyInterval] = useState(initial?.frequency_interval ?? 1)
  const [dayOfWeek, setDayOfWeek] = useState(initial?.frequency_day_of_week ?? 1)
  const [dayOfMonth, setDayOfMonth] = useState(initial?.frequency_day_of_month ?? 1)
  const [status, setStatus] = useState<RoutineStatus>(initial?.status ?? 'active')
  const [nextDueDate, setNextDueDate] = useState(initial?.next_due_date ?? format(new Date(), 'yyyy-MM-dd'))
  const [checklistItems, setChecklistItems] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        frequency_type: frequencyType,
        frequency_interval: frequencyInterval,
        frequency_day_of_week: frequencyType === 'weekly' ? dayOfWeek : null,
        frequency_day_of_month: frequencyType === 'monthly' ? dayOfMonth : null,
        status,
        next_due_date: nextDueDate || null,
      }, checklistItems.map(s => s.trim()).filter(Boolean))
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {initial?.id ? 'Edit Routine' : 'New Routine'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Weekly Marketing Review..."
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional notes about this routine..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
            <input
              list="category-suggestions"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Marketing, Reporting, Admin..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Frequency</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {(['daily', 'weekly', 'monthly', 'yearly', 'custom'] as RoutineFrequency[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequencyType(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    frequencyType === f
                      ? 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/40'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-violet-500/30'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {frequencyType === 'weekly' && (
              <div className="flex gap-1 flex-wrap mt-2">
                {DAY_OPTIONS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDayOfWeek(i)}
                    className={`w-9 h-9 rounded-lg text-xs font-semibold transition-all ${
                      dayOfWeek === i
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-500/10'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {frequencyType === 'monthly' && (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-slate-500">Day of month:</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={dayOfMonth}
                  onChange={e => setDayOfMonth(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
              </div>
            )}

            {(frequencyType === 'custom' || frequencyType === 'daily') && (
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-slate-500">Every</label>
                <input
                  type="number"
                  min={1}
                  value={frequencyInterval}
                  onChange={e => setFrequencyInterval(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                />
                <label className="text-xs text-slate-500">days</label>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
            <div className="flex gap-2">
              {(['active', 'paused'] as RoutineStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    status === s
                      ? s === 'active'
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* First due date */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">First due date</label>
            <input
              type="date"
              value={nextDueDate}
              onChange={e => setNextDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>

          {/* Checklist Items */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Checklist Items</label>
            <div className="space-y-2">
              {checklistItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={item}
                    onChange={e => {
                      const updated = [...checklistItems]
                      updated[i] = e.target.value
                      setChecklistItems(updated)
                    }}
                    placeholder={`Item ${i + 1}...`}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  />
                  {checklistItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setChecklistItems(checklistItems.filter((_, j) => j !== i))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setChecklistItems([...checklistItems, ''])}
                className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add item
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : initial?.id ? 'Update' : 'Create Routine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
