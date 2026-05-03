'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { toast } from 'sonner'
import { DatePicker } from '@/components/ui/DatePicker'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AddTaskFormProps {
  projectId: string
  subProjectId: string | null   // null = direct task
  onCreated: () => void
  onCancel: () => void
}

const INPUT_CLASS =
  'w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-slate-100 ' +
  'placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50'

export default function AddTaskForm({
  projectId,
  subProjectId,
  onCreated,
  onCancel,
}: AddTaskFormProps) {
  const { createTask } = useTasks()

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Effort tracking state
  const [effortEstimate, setEffortEstimate] = useState<number | ''>('')
  const [actualEffort, setActualEffort] = useState<number | ''>('')
  const [effortUnit, setEffortUnit] = useState<'hours' | 'days' | 'story_points'>('hours')
  
  // Backdate & audit state
  const [plannedCompletedDate, setPlannedCompletedDate] = useState<Date | undefined>(undefined)
  
  // Blocker tracking state
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockerReason, setBlockerReason] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    if (startDate && endDate && endDate < startDate) {
      setError('End date cannot be before start date')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const startDateStr = startDate ? startDate.toISOString().split('T')[0] : null
      const endDateStr = endDate ? endDate.toISOString().split('T')[0] : null
      
      await createTask({
        title,
        project_id: projectId,
        sub_project_id: subProjectId,
        start_date: startDateStr,
        end_date: endDateStr,
        progress_percent: 0,
        status: 'todo',
        effort_estimate: effortEstimate === '' ? 0 : effortEstimate,
        actual_effort: actualEffort === '' ? 0 : actualEffort,
        effort_unit: effortUnit,
        planned_completed_date: plannedCompletedDate ? plannedCompletedDate.toISOString().split('T')[0] : null,
        is_blocked: isBlocked,
        blocker_reason: blockerReason || null,
      })
      toast.success('Task created successfully!')
      onCreated()
    } catch (err: any) {
      setError(err?.message || 'Gagal membuat task.')
      toast.error('Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-violet-200 dark:border-violet-500/20 space-y-3"
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

      {/* Planned Completion Date */}
      <div>
        <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 font-medium uppercase tracking-wide">
          Planned Completion (Target)
        </label>
        <DatePicker
          date={plannedCompletedDate}
          onSelect={setPlannedCompletedDate}
          placeholder="Target deadline"
        />
      </div>

      {/* Dates — 2 col grid */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 font-medium uppercase tracking-wide">
            Start Date
          </label>
          <DatePicker
            date={startDate}
            onSelect={setStartDate}
            placeholder="Pick date"
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 font-medium uppercase tracking-wide">
            End Date
          </label>
          <DatePicker
            date={endDate}
            onSelect={setEndDate}
            placeholder="Pick date"
          />
        </div>
      </div>

      {/* Blocker Tracking Section */}
      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isBlocked"
            checked={isBlocked}
            onChange={(e) => setIsBlocked(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-600"
          />
          <label htmlFor="isBlocked" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
            This task is blocked
          </label>
        </div>
        
        {isBlocked && (
          <div>
            <label className="block text-[10px] text-slate-500 dark:text-slate-500 mb-1">
              Blocker Reason
            </label>
            <input
              type="text"
              value={blockerReason}
              onChange={(e) => setBlockerReason(e.target.value)}
              placeholder="What is blocking this task?"
              className={INPUT_CLASS}
            />
          </div>
        )}
      </div>

      {/* Effort Tracking Section */}
      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
        <h4 className="text-[10px] font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Effort Tracking
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 dark:text-slate-500 mb-1">
              Estimated
            </label>
            <div className="flex gap-1">
              <input
                type="number"
                min="0"
                value={effortEstimate}
                onChange={(e) => setEffortEstimate(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="0"
                className={cn(INPUT_CLASS, 'flex-1')}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] text-slate-500 dark:text-slate-500 mb-1">
              Actual
            </label>
            <input
              type="number"
              min="0"
              value={actualEffort}
              onChange={(e) => setActualEffort(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className={INPUT_CLASS}
            />
          </div>
        </div>
        
        <Select value={effortUnit} onValueChange={(v) => setEffortUnit(v as typeof effortUnit)}>
          <SelectTrigger className="w-full h-8 text-xs bg-white dark:bg-slate-800/50 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <SelectItem value="hours" className="text-slate-900 dark:text-white text-xs">Hours</SelectItem>
            <SelectItem value="days" className="text-slate-900 dark:text-white text-xs">Days</SelectItem>
            <SelectItem value="story_points" className="text-slate-900 dark:text-white text-xs">Story Points</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Efficiency Indicator */}
        {effortEstimate !== '' && effortEstimate > 0 && (
          <div className="text-xs flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Efficiency:</span>
            <span className={cn(
              "font-medium",
              actualEffort === '' || actualEffort === 0 ? "text-slate-500 dark:text-slate-400" :
              (actualEffort || 0) <= (effortEstimate || 0) * 0.9 ? "text-green-600 dark:text-green-400" :
              (actualEffort || 0) <= (effortEstimate || 0) * 1.1 ? "text-yellow-600 dark:text-yellow-400" :
              "text-red-600 dark:text-red-400"
            )}>
              {actualEffort !== '' && actualEffort > 0 
                ? `${Math.round(((actualEffort || 0) / (effortEstimate || 1)) * 100)}%` 
                : 'Not started'
              }
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800/70 hover:bg-slate-300 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
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
