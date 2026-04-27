'use client'

import { useMemo, useState } from 'react'
import { HabitDayData } from '@/hooks/useHabitData'
import { format, startOfWeek, addDays, parseISO, getDay } from 'date-fns'

interface HabitHeatmapProps {
  data: HabitDayData[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Mon', 'Wed', 'Fri']

export default function HabitHeatmap({ data }: HabitHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<HabitDayData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const { grid, monthLabels } = useMemo(() => {
    // Create a 7x53 grid (7 days x 53 weeks)
    const grid: (HabitDayData | null)[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 53 }, () => null)
    )

    // Map data by date for quick lookup
    const dataMap = new Map<string, HabitDayData>()
    data.forEach(d => dataMap.set(d.date, d))

    // Get the start date (52 weeks ago from today, starting on Sunday)
    const today = new Date()
    const startDate = startOfWeek(addDays(today, -364), { weekStartsOn: 0 }) // Sunday

    // Fill the grid
    let currentDate = startDate
    for (let week = 0; week < 53; week++) {
      for (let day = 0; day < 7; day++) {
        const dateStr = format(currentDate, 'yyyy-MM-dd')
        const dayData = dataMap.get(dateStr)

        if (dayData) {
          grid[day][week] = dayData
        } else {
          grid[day][week] = { date: dateStr, count: 0, habits: [] }
        }

        currentDate = addDays(currentDate, 1)
      }
    }

    // Calculate month labels
    const monthLabels: { label: string; col: number }[] = []
    let lastMonth = -1
    currentDate = startDate

    for (let week = 0; week < 53; week++) {
      const month = currentDate.getMonth()
      if (month !== lastMonth) {
        monthLabels.push({ label: MONTHS[month], col: week })
        lastMonth = month
      }
      currentDate = addDays(currentDate, 7)
    }

    return { grid, monthLabels }
  }, [data])

  const getCellColor = (count: number): string => {
    if (count === 0) return 'bg-slate-800/50'
    if (count === 1) return 'bg-green-900/80'
    if (count === 2) return 'bg-green-700/90'
    return 'bg-green-500' // 3+
  }

  const getCellGlow = (count: number): string => {
    if (count >= 3) return 'shadow-[0_0_6px_#22c55e]'
    return ''
  }

  const handleMouseEnter = (dayData: HabitDayData, e: React.MouseEvent) => {
    setHoveredCell(dayData)
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    })
  }

  const handleMouseLeave = () => {
    setHoveredCell(null)
  }

  return (
    <div className="relative">
      {/* Month labels */}
      <div className="flex mb-2 pl-8">
        <div className="relative flex-1">
          {monthLabels.map(({ label, col }) => (
            <div
              key={`${label}-${col}`}
              className="absolute text-[10px] text-muted-foreground font-medium"
              style={{ left: `${(col / 53) * 100}%` }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-2">
        {/* Day labels */}
        <div className="flex flex-col justify-between py-1">
          {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => (
            <div
              key={dayIndex}
              className="h-[11px] flex items-center text-[9px] text-muted-foreground font-medium"
            >
              {dayIndex === 1 ? 'Mon' : dayIndex === 3 ? 'Wed' : dayIndex === 5 ? 'Fri' : ''}
            </div>
          ))}
        </div>

        {/* Grid container with horizontal scroll */}
        <div className="flex-1 overflow-x-auto">
          <div className="inline-grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(53, 11px)' }}>
            {grid.map((week, weekIndex) =>
              week.map((dayData, dayIndex) => {
                if (!dayData) return null

                const isToday = dayData.date === format(new Date(), 'yyyy-MM-dd')

                return (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      w-[11px] h-[11px] rounded-sm cursor-pointer
                      transition-all duration-200 ease-out
                      hover:scale-125 hover:z-10
                      ${getCellColor(dayData.count)}
                      ${getCellGlow(dayData.count)}
                      ${isToday ? 'ring-1 ring-violet-400 ring-offset-1 ring-offset-slate-900' : ''}
                    `}
                    style={{ gridColumn: weekIndex + 1, gridRow: dayIndex + 1 }}
                    onMouseEnter={(e) => handleMouseEnter(dayData, e)}
                    onMouseLeave={handleMouseLeave}
                  />
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 glass rounded-lg p-3 border border-white/10 shadow-xl pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-xs font-semibold text-foreground mb-1">
            {format(parseISO(hoveredCell.date), 'MMM d, yyyy')}
          </div>
          {hoveredCell.count > 0 ? (
            <>
              <div className="text-[10px] text-muted-foreground mb-1.5">
                {hoveredCell.count} habit{hoveredCell.count > 1 ? 's' : ''} completed
              </div>
              <div className="space-y-0.5">
                {hoveredCell.habits.map((habit, idx) => (
                  <div key={idx} className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    {habit}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[10px] text-muted-foreground">No habits completed</div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-slate-800/50" />
          <div className="w-3 h-3 rounded-sm bg-green-900/80" />
          <div className="w-3 h-3 rounded-sm bg-green-700/90" />
          <div className="w-3 h-3 rounded-sm bg-green-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  )
}
