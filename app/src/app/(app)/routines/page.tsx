'use client'

import { useState } from 'react'
import { useRoutines } from '@/hooks/useRoutines'
import { Routine } from '@/types'
import TopNav from '@/components/layout/TopNav'
import RoutineCard from '@/components/routines/RoutineCard'
import AddRoutineModal from '@/components/routines/AddRoutineModal'
import { Plus, Loader2, RefreshCw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'active' | 'paused' | 'archived'

export default function RoutinesPage() {
  const { routines, loading, overdueCount, createRoutine, markDone } = useRoutines()
  const [showAdd, setShowAdd] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const categories = ['all', ...Array.from(new Set(routines.map(r => r.category).filter(Boolean) as string[]))]

  const filtered = routines.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchCat = categoryFilter === 'all' || r.category === categoryFilter
    return matchStatus && matchCat
  })

  return (
    <div className="flex-1 flex flex-col">
      <TopNav title="Routines" subtitle="Recurring tasks & workflows" />

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">

        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">All Routines</h2>
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {overdueCount} overdue
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white text-sm font-medium transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Routine</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status filter */}
          <div className="flex items-center gap-0.5 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl">
            {(['all', 'active', 'paused', 'archived'] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  statusFilter === f
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Category filter */}
          {categories.length > 1 && (
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">
              {routines.length === 0 ? 'No routines yet.' : 'No routines match this filter.'}
            </p>
            {routines.length === 0 && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 text-sm font-medium hover:bg-violet-500/25 transition-colors"
              >
                Create your first routine
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(routine => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                onMarkDone={markDone}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddRoutineModal
          onClose={() => setShowAdd(false)}
          onSave={createRoutine}
        />
      )}
    </div>
  )
}
