'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoutineDetail } from '@/hooks/useRoutineDetail'
import { useRoutines } from '@/hooks/useRoutines'
import TopNav from '@/components/layout/TopNav'
import RoutineNotesSection from '@/components/routines/RoutineNotesSection'
import DelayReasonModal from '@/components/routines/DelayReasonModal'
import AddRoutineModal from '@/components/routines/AddRoutineModal'
import { getFrequencyLabel, getDueDateColor, getDueDateBg } from '@/lib/routineUtils'
import { format } from 'date-fns'
import {
  ArrowLeft, Edit2, Trash2, CheckCircle2, Clock, RefreshCw,
  Plus, X, Loader2, AlertTriangle, ChevronDown, ChevronRight
} from 'lucide-react'
import { Routine, RoutineChecklistItem } from '@/types'
import { cn } from '@/lib/utils'
import { OccurrenceWithChecks } from '@/hooks/useRoutineDetail'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  completed: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  delayed:   { label: 'Delayed',   color: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
}

export default function RoutineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const {
    routine, occurrences, checklistItems, loading, error,
    toggleCheck, addChecklistItem, deleteChecklistItem,
    updateRoutine, markOccurrenceDone, markOccurrenceDelayed,
    overdueOccurrences, upcomingOccurrence,
  } = useRoutineDetail(id)
  const { createRoutine, deleteRoutine } = useRoutines()

  const [showEdit, setShowEdit] = useState(false)
  const [delayModal, setDelayModal] = useState<OccurrenceWithChecks | null>(null)
  const [newCheckItem, setNewCheckItem] = useState('')
  const [addingCheck, setAddingCheck] = useState(false)
  const [expandedOccId, setExpandedOccId] = useState<string | null>(null)
  const [historyExpanded, setHistoryExpanded] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')

  const handleAddCheckItem = async () => {
    if (!newCheckItem.trim()) return
    setAddingCheck(true)
    await addChecklistItem(newCheckItem.trim())
    setNewCheckItem('')
    setAddingCheck(false)
  }

  const handleEditSave = async (
    payload: Omit<Routine, 'id' | 'owner_id' | 'created_at' | 'updated_at'>,
    _checklistLabels: string[]
  ) => {
    await updateRoutine(payload)
    setShowEdit(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this routine and all its occurrences? This cannot be undone.')) return
    await deleteRoutine(id)
    router.push('/routines')
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <TopNav title="Routine" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        </div>
      </div>
    )
  }

  if (error || !routine) {
    return (
      <div className="flex-1 flex flex-col">
        <TopNav title="Routine" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-slate-500 dark:text-slate-400 mb-4">{error ?? 'Routine not found'}</p>
            <button onClick={() => router.push('/routines')} className="text-sm text-violet-500 hover:underline">
              ← Back to Routines
            </button>
          </div>
        </div>
      </div>
    )
  }

  const pendingOcc = upcomingOccurrence
  const earliestPendingDate = occurrences
    .filter(o => o.status === 'pending')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0]?.due_date ?? routine.next_due_date
  const completedCount = occurrences.filter(o => o.status === 'completed').length
  const delayedCount = occurrences.filter(o => o.status === 'delayed').length
  const onTimeRate = occurrences.length > 0
    ? Math.round((completedCount / occurrences.length) * 100)
    : 0

  return (
    <div className="flex-1 flex flex-col">
      <TopNav title="Routine Detail" />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">

        {/* Back */}
        <button
          onClick={() => router.push('/routines')}
          className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Routines
        </button>

        {/* Header Card */}
        <div className="glass rounded-2xl p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {routine.category && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-medium">
                    {routine.category}
                  </span>
                )}
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                  routine.status === 'active' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : routine.status === 'paused' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600'
                }`}>
                  {routine.status.charAt(0).toUpperCase() + routine.status.slice(1)}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold gradient-text break-words">{routine.title}</h1>
              {routine.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{routine.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setShowEdit(true)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={handleDelete}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{getFrequencyLabel(routine)}</span>
            </div>
            {earliestPendingDate && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${getDueDateBg(earliestPendingDate)}`}>
                <Clock className="w-3 h-3" />
                <span className={`font-medium ${getDueDateColor(earliestPendingDate)}`}>
                  Next due: {format(new Date(earliestPendingDate + 'T00:00:00'), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
            {[
              { label: 'Total runs', value: occurrences.length },
              { label: 'Completed', value: completedCount },
              { label: 'On-time %', value: `${onTimeRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-lg font-bold gradient-text">{value}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Occurrences — require explicit action */}
        {overdueOccurrences.length > 0 && routine.status === 'active' && (
          <div className="glass rounded-2xl p-4 sm:p-5 border-2 border-red-500/40 bg-red-50/30 dark:bg-red-500/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                Overdue &middot; {overdueOccurrences.length} occurrence{overdueOccurrences.length !== 1 ? 's' : ''}
              </h3>
            </div>
            <div className="space-y-2">
              {overdueOccurrences.map(occ => {
                const daysOverdue = Math.round((Date.now() - new Date(occ.due_date + 'T00:00:00').getTime()) / 86400000)
                return (
                  <div key={occ.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/60 dark:bg-slate-900/30 border border-red-500/20 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        Due {format(new Date(occ.due_date + 'T00:00:00'), 'EEEE, MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
                        {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setDelayModal(occ)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors font-medium"
                      >
                        Delayed?
                      </button>
                      <button
                        onClick={() => markOccurrenceDone(occ.id)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors font-medium"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Done
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Upcoming Occurrence / Mark Done */}
        {pendingOcc && routine.status === 'active' && (
          <div className={`glass rounded-2xl p-4 sm:p-5 border ${
            pendingOcc.due_date < today
              ? 'border-red-500/30 bg-red-50/30 dark:bg-red-500/5'
              : pendingOcc.due_date === today
              ? 'border-amber-500/30 bg-amber-50/30 dark:bg-amber-500/5'
              : 'border-emerald-500/30'
          }`}>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                  {pendingOcc.due_date < today ? 'Overdue' : pendingOcc.due_date === today ? 'Due Today' : 'Upcoming'}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  Due {format(new Date(pendingOcc.due_date + 'T00:00:00'), 'EEEE, MMM d, yyyy')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDelayModal(pendingOcc)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors font-medium"
                >
                  Delayed?
                </button>
                <button
                  onClick={() => markOccurrenceDone(pendingOcc.id)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors font-medium"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Done
                </button>
              </div>
            </div>

            {/* Checklist for this occurrence */}
            {checklistItems.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                {checklistItems.map(item => {
                  const check = pendingOcc.checks.find(c => c.checklist_item_id === item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleCheck(pendingOcc.id, item.id, check?.is_checked ?? false)}
                      className="w-full flex items-center gap-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-lg p-1.5 transition-colors"
                    >
                      <div className={cn(
                        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                        check?.is_checked
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-slate-300 dark:border-slate-600'
                      )}>
                        {check?.is_checked && <X className="w-3 h-3 text-white" style={{ transform: 'rotate(45deg)' }} />}
                        {check?.is_checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={cn('text-sm', check?.is_checked ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-slate-100')}>
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Checklist Management */}
        <div className="glass rounded-2xl p-4 sm:p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Checklist Items</h3>
          {checklistItems.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">No checklist items yet.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {checklistItems.map((item: RoutineChecklistItem) => (
                <li key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/30 group">
                  <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                  <span className="flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-200 truncate">{item.label}</span>
                  <button
                    onClick={() => deleteChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              value={newCheckItem}
              onChange={e => setNewCheckItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCheckItem()}
              placeholder="Add checklist item..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <button
              onClick={handleAddCheckItem}
              disabled={!newCheckItem.trim() || addingCheck}
              className="px-3 py-2 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 transition-colors disabled:opacity-50"
            >
              {addingCheck ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Occurrence History */}
        <div className="glass rounded-2xl overflow-hidden">
          <button
            onClick={() => setHistoryExpanded(e => !e)}
            className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Occurrence History
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                ({occurrences.length})
              </span>
            </h3>
            {historyExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>

          {historyExpanded && (
            <div className="px-4 sm:px-5 pb-4 sm:pb-5">
              {occurrences.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No occurrences yet.</p>
              ) : (
                <div className="space-y-2">
                  {occurrences.map(occ => {
                    const sb = STATUS_BADGE[occ.status]
                    const isExpanded = expandedOccId === occ.id
                    const isOverdue = occ.status === 'pending' && occ.due_date < today
                    return (
                      <div key={occ.id} className={cn(
                        'rounded-xl border transition-all',
                        isOverdue
                          ? 'border-red-500/30 bg-red-50/20 dark:bg-red-500/5'
                          : 'border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/20'
                      )}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedOccId(isExpanded ? null : occ.id)}
                          onKeyDown={e => e.key === 'Enter' && setExpandedOccId(isExpanded ? null : occ.id)}
                          className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {format(new Date(occ.due_date + 'T00:00:00'), 'MMM d, yyyy')}
                              </span>
                              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium', sb.color)}>
                                {sb.label}
                              </span>
                              {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                            </div>
                            {occ.completed_at && (
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Completed {format(new Date(occ.completed_at), 'MMM d, HH:mm')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {occ.status === 'pending' && (
                              <button
                                onClick={e => { e.stopPropagation(); setDelayModal(occ) }}
                                className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                              >
                                Delayed?
                              </button>
                            )}
                            {occ.status === 'pending' && (
                              <button
                                onClick={e => { e.stopPropagation(); markOccurrenceDone(occ.id) }}
                                className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                              >
                                Done
                              </button>
                            )}
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3 pb-3 pt-1 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
                            {occ.delay_reason && (
                              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-500/20">
                                <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-0.5">Delay reason</p>
                                <p className="text-xs text-slate-700 dark:text-slate-300">{occ.delay_reason}</p>
                              </div>
                            )}
                            {occ.notes && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 italic">{occ.notes}</p>
                            )}
                            {occ.checks.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Checklist</p>
                                {occ.checks.map(c => {
                                  const item = checklistItems.find(ci => ci.id === c.checklist_item_id)
                                  return (
                                    <div key={c.id} className="flex items-center gap-2">
                                      <div className={cn('w-3.5 h-3.5 rounded border shrink-0', c.is_checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600')} />
                                      <span className={cn('text-xs', c.is_checked ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-300')}>
                                        {item?.label ?? 'Unknown item'}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        <RoutineNotesSection routineId={id} />
      </div>

      {/* Delay Modal */}
      {delayModal && (
        <DelayReasonModal
          occurrenceId={delayModal.id}
          dueDate={delayModal.due_date}
          routineTitle={routine.title}
          onDelay={markOccurrenceDelayed}
          onMarkDone={markOccurrenceDone}
          onClose={() => setDelayModal(null)}
        />
      )}

      {/* Edit Modal */}
      {showEdit && (
        <AddRoutineModal
          onClose={() => setShowEdit(false)}
          onSave={handleEditSave}
          initial={routine}
        />
      )}
    </div>
  )
}
