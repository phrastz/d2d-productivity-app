'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts'
import { TrendingUp } from 'lucide-react'

interface DayData {
  day: string
  completed: number
  total: number
}

interface WeeklyChartProps {
  data: DayData[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 border border-white/10 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-emerald-400">{payload[0].value} completed</p>
      <p className="text-muted-foreground">{payload[1]?.value ?? 0} remaining</p>
    </div>
  )
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  const totalCompleted = data.reduce((s, d) => s + d.completed, 0)

  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Weekly Progress
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Tasks completed this week</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold gradient-text">{totalCompleted}</p>
          <p className="text-[10px] text-muted-foreground">this week</p>
        </div>
      </div>

      <div style={{ width: '100%', height: '160px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barSize={14} barGap={4}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(255,255,255,0.05)"
            />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="completed" stackId="a" radius={[0, 0, 0, 0]}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={`hsl(${250 + i * 4} 84% ${55 + i * 2}%)`}
                />
              ))}
            </Bar>
            <Bar dataKey="remaining" stackId="a" radius={[4, 4, 0, 0]} fill="hsl(222 47% 15%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
