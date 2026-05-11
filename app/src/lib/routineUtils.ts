import { Routine } from '@/types'
import { addDays, addWeeks, addMonths, addYears, setDay, setDate, format } from 'date-fns'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function getFrequencyLabel(routine: Routine): string {
  const { frequency_type, frequency_interval, frequency_day_of_week, frequency_day_of_month } = routine
  if (!frequency_type) return 'No schedule'
  switch (frequency_type) {
    case 'daily':
      return frequency_interval === 1 ? 'Every day' : `Every ${frequency_interval} days`
    case 'weekly':
      const dayName = frequency_day_of_week != null ? DAY_NAMES[frequency_day_of_week] : ''
      return frequency_interval === 1
        ? `Every ${dayName || 'week'}`
        : `Every ${frequency_interval} weeks${dayName ? ` on ${dayName}` : ''}`
    case 'monthly':
      return frequency_day_of_month
        ? `Monthly on the ${ordinal(frequency_day_of_month)}`
        : 'Monthly'
    case 'yearly':
      return 'Yearly'
    case 'custom':
      return `Every ${frequency_interval} ${frequency_interval === 1 ? 'day' : 'days'}`
    default:
      return frequency_type
  }
}

export function computeNextDueDate(routine: Routine, fromDate: Date = new Date()): Date {
  const { frequency_type, frequency_interval, frequency_day_of_week, frequency_day_of_month } = routine
  const interval = frequency_interval ?? 1
  switch (frequency_type) {
    case 'daily':
      return addDays(fromDate, interval)
    case 'weekly': {
      let next = addWeeks(fromDate, interval)
      if (frequency_day_of_week != null) next = setDay(next, frequency_day_of_week, { weekStartsOn: 0 })
      return next
    }
    case 'monthly': {
      let next = addMonths(fromDate, interval)
      if (frequency_day_of_month) next = setDate(next, Math.min(frequency_day_of_month, 28))
      return next
    }
    case 'yearly':
      return addYears(fromDate, 1)
    case 'custom':
      return addDays(fromDate, interval)
    default:
      return addDays(fromDate, 7)
  }
}

export function getDueDateColor(dueDateStr: string | null): string {
  if (!dueDateStr) return 'text-slate-400'
  const today = format(new Date(), 'yyyy-MM-dd')
  if (dueDateStr < today) return 'text-red-500 dark:text-red-400'
  if (dueDateStr === today) return 'text-amber-500 dark:text-amber-400'
  return 'text-emerald-600 dark:text-emerald-400'
}

export function getDueDateBg(dueDateStr: string | null): string {
  if (!dueDateStr) return 'bg-slate-100 dark:bg-slate-800/50'
  const today = format(new Date(), 'yyyy-MM-dd')
  if (dueDateStr < today) return 'bg-red-50 dark:bg-red-500/10'
  if (dueDateStr === today) return 'bg-amber-50 dark:bg-amber-500/10'
  return 'bg-emerald-50 dark:bg-emerald-500/10'
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
