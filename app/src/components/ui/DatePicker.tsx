"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onSelect?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex items-center justify-start w-full px-3 py-2 rounded-md",
          "text-left font-normal text-sm",
          "bg-white dark:bg-slate-800/50",
          "text-slate-900 dark:text-white",
          "border border-slate-300 dark:border-white/10",
          "hover:bg-slate-50 dark:hover:bg-slate-800/70",
          "focus:outline-none focus:ring-2 focus:ring-violet-500/50",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !date && "text-slate-500 dark:text-slate-400",
          className
        )}
      >
        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
        {date ? format(date, "PPP") : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800" 
        align="start"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={(newDate) => {
            onSelect?.(newDate)
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface DateRangePickerProps {
  startDate: Date | undefined
  endDate: Date | undefined
  onStartSelect: (date: Date | undefined) => void
  onEndSelect: (date: Date | undefined) => void
  className?: string
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartSelect,
  onEndSelect,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      <DatePicker
        date={startDate}
        onSelect={onStartSelect}
        placeholder="Start Date"
      />
      <DatePicker
        date={endDate}
        onSelect={onEndSelect}
        placeholder="End Date"
      />
    </div>
  )
}
