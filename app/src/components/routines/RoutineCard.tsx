'use client'

import { useRouter } from 'next/navigation'
import { RoutineWithLatestOccurrence } from '@/hooks/useRoutines'
import { getFrequencyLabel, getDueDateColor, getDueDateBg } from '@/lib/routineUtils'
import { format } from 'date-fns'
import { CheckCircle2, Clock, Pause, ChevronRight, RefreshCw } from 'lucide-react'

interface RoutineCardProps {
  routine: RoutineWithLatestOccurrence
  onMarkDone: (routineId: string, occurrenceId: string) => Promise<void>
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active:   { label: 'Active',   color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  paused:   { label: 'Paused',   color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  archived: { label: 'Archived', color: 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600' },
}

const OCC_BADGE: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  completed: { label: 'Completed', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  delayed:   { label: 'Delayed',   color: 'bg-red-500/15 text-red-600 dark:text-red-400' },
}

export default function RoutineCard({ routine, onMarkDone }: RoutineCardProps) {
  const router = useRouter()
  const sb = STATUS_BADGE[routine.status]
  const occ = routine.latestOccurrence
  const ob = occ ? OCC_BADGE[occ.status] : null
  const dueDateColor = getDueDateColor(routine.next_due_date)
  const dueDateBg = getDueDateBg(routine.next_due_date)
  const isOverdue = !!routine.overdueCount && routine.overdueCount > 0
  const canMarkDone = occ && occ.status === 'pending'

  return (
    <div
      className="glass rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/5 hover:border-violet-500/30 transition-all cursor-pointer group"
      onClick={() => router.push(`/routines/${routine.id}`)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {routine.category && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-medium shrink-0">
                {routine.category}
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${sb.color}`}>
              {sb.label}
            </span>
            {isOverdue && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 font-medium shrink-0">
                {routine.overdueCount} overdue
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {routine.title}
          </h3>
          {routine.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{routine.description}</p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0 mt-1 group-hover:text-violet-400 transition-colors" />
      </div>

      {/* Info row */}
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          <span>{getFrequencyLabel(routine)}</span>
        </div>
        {routine.next_due_date && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${dueDateBg}`}>
            <Clock className="w-3 h-3" />
            <span className={`font-medium ${dueDateColor}`}>
              Due {format(new Date(routine.next_due_date + 'T00:00:00'), 'MMM d')}
            </span>
          </div>
        )}
        {ob && (
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${ob.color}`}>
            {ob.label}
          </span>
        )}
      </div>

      {/* Action row */}
      {canMarkDone && routine.status === 'active' && (
        <button
          onClick={e => {
            e.stopPropagation()
            onMarkDone(routine.id, occ!.id)
          }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors font-medium"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark Done
        </button>
      )}
      {routine.status === 'paused' && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <Pause className="w-3.5 h-3.5" />
          Paused
        </div>
      )}
    </div>
  )
}
