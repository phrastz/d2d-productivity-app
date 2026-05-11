'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface DelayReasonModalProps {
  occurrenceId: string
  dueDate: string
  routineTitle: string
  onDelay: (occurrenceId: string, reason: string, newExpected?: string) => Promise<void>
  onMarkDone: (occurrenceId: string) => Promise<void>
  onClose: () => void
}

export default function DelayReasonModal({
  occurrenceId,
  dueDate,
  routineTitle,
  onDelay,
  onMarkDone,
  onClose,
}: DelayReasonModalProps) {
  const [reason, setReason] = useState('')
  const [newExpected, setNewExpected] = useState('')
  const [saving, setSaving] = useState(false)

  const handleDelay = async () => {
    if (!reason.trim()) return
    setSaving(true)
    try {
      await onDelay(occurrenceId, reason.trim(), newExpected || undefined)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleDone = async () => {
    setSaving(true)
    try {
      await onMarkDone(occurrenceId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Overdue Routine</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">{routineTitle}</span> was due on{' '}
            <span className="font-semibold text-red-500">{dueDate}</span>.
          </p>

          {/* Mark done option */}
          <button
            onClick={handleDone}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-sm font-medium hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
          >
            ✓ Mark as Completed Now
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span>or mark as delayed</span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Delay reason */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Reason for delay <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Explain why this was delayed..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">New expected date (optional)</label>
            <input
              type="date"
              value={newExpected}
              onChange={e => setNewExpected(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleDelay}
              disabled={!reason.trim() || saving}
              className="flex-1 py-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Mark as Delayed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
