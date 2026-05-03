'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer, View } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useCalendarEvents, CalendarEvent } from '@/hooks/useCalendarEvents'
import { createClient } from '@/lib/supabase/client'
import TopNav from '@/components/layout/TopNav'
import { X, Loader2, Calendar as CalendarIcon, ExternalLink } from 'lucide-react'
import { Task, Project, DailyLog } from '@/types'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import './calendar.css'

// Setup date-fns localizer
const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

const DragAndDropCalendar = withDragAndDrop<CalendarEvent>(BigCalendar)

export default function CalendarPage() {
  const supabase = createClient()
  const { events, loading, error } = useCalendarEvents()
  const [view, setView] = useState<View>('month')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [updating, setUpdating] = useState(false)
  
  // Filter states
  const [filterProject, setFilterProject] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string[]>(['todo', 'in_progress', 'done'])
  const [projects, setProjects] = useState<any[]>([])
  
  // Fetch projects for filter dropdown
  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase
          .from('projects')
          .select('id, name')
          .eq('owner_id', user.id)
          .order('name')
        
        setProjects(data || [])
      }
    }
    
    loadProjects()
  }, [])

  // Handle event drop (drag & drop)
  const handleEventDrop = useCallback(async (args: any) => {
    const { event, start, end } = args
    const startDate = start instanceof Date ? start : new Date(start)
    const endDate = end instanceof Date ? end : new Date(end)
    
    setUpdating(true)
    
    try {
      if (event.resource.type === 'task') {
        // Update task due_date
        const { error } = await supabase
          .from('tasks')
          .update({ due_date: startDate.toISOString() })
          .eq('id', event.resource.originalId)
        
        if (error) throw error
        
        // Show success toast (you can add a toast library later)
        console.log('✅ Task rescheduled successfully')
      } else if (event.resource.type === 'project') {
        // Calculate duration and update project dates
        const duration = endDate.getTime() - startDate.getTime()
        const newEnd = new Date(startDate.getTime() + duration)
        
        const { error } = await supabase
          .from('projects')
          .update({
            start_date: startDate.toISOString().split('T')[0],
            end_date: newEnd.toISOString().split('T')[0]
          })
          .eq('id', event.resource.originalId)
        
        if (error) throw error
        
        console.log('✅ Project rescheduled successfully')
      } else if (event.resource.type === 'daily_log') {
        // Update daily log date
        const { error } = await supabase
          .from('daily_logs')
          .update({ date: startDate.toISOString().split('T')[0] })
          .eq('id', event.resource.originalId)
        
        if (error) throw error
        
        console.log('✅ Daily log rescheduled successfully')
      }
    } catch (err) {
      console.error('Failed to reschedule:', err)
      alert('Failed to reschedule. Please try again.')
    } finally {
      setUpdating(false)
    }
  }, [supabase])

  // Handle event click
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowDialog(true)
  }, [])

  // Custom event style
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    return {
      style: {
        backgroundColor: event.resource.color,
        borderRadius: '8px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        padding: '4px 8px',
      }
    }
  }, [])
  
  // Filter events based on selected filters
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Filter by project
      if (filterProject !== 'all') {
        if (event.resource.type === 'task') {
          // Tasks have project_id in their data
          const taskProjectId = (event.resource.data as Task).project_id
          if (taskProjectId !== filterProject) return false
        } else if (event.resource.type === 'project') {
          // Projects are matched by their own ID
          if (event.resource.originalId !== filterProject) return false
        } else {
          // Daily logs don't belong to projects, hide when filtering
          return false
        }
      }
      
      // Filter by status (only for tasks)
      if (event.resource.type === 'task') {
        const taskStatus = (event.resource.data as Task).status
        if (!filterStatus.includes(taskStatus)) {
          return false
        }
      }
      
      return true
    })
  }, [events, filterProject, filterStatus])

  if (loading) {
    return (
      <>
        <TopNav title="Calendar" subtitle="Plan your week visually" />
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <TopNav title="Calendar" subtitle="Plan your week visually" />
        <div className="p-6">
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-red-400">Error loading calendar: {error}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title="Calendar" subtitle="Plan your week visually" />
      
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Filter Section */}
        <div className="glass rounded-2xl p-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent">
          <div className="flex flex-wrap gap-6 items-center">
            {/* Project Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Project:
              </label>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="px-3 py-2 border-2 border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-violet-500 dark:focus:border-violet-400 outline-none"
              >
                <option value="all">All Projects</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Status Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Status:
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterStatus.includes('todo')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilterStatus([...filterStatus, 'todo'])
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== 'todo'))
                      }
                    }}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">To Do</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterStatus.includes('in_progress')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilterStatus([...filterStatus, 'in_progress'])
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== 'in_progress'))
                      }
                    }}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">In Progress</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterStatus.includes('done')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilterStatus([...filterStatus, 'done'])
                      } else {
                        setFilterStatus(filterStatus.filter(s => s !== 'done'))
                      }
                    }}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Done</span>
                </label>
              </div>
            </div>
            
            {/* Clear Filters Button */}
            <button
              onClick={() => {
                setFilterProject('all')
                setFilterStatus(['todo', 'in_progress', 'done'])
              }}
              className="ml-auto px-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        {/* Calendar Container */}
        <div className="glass rounded-2xl p-6 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent" style={{ minHeight: '700px' }}>
          {updating && (
            <div className="mb-4 flex items-center gap-2 text-sm text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
          
          <DragAndDropCalendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '650px' }}
            view={view}
            onView={setView}
            views={['month', 'week']}
            onEventDrop={handleEventDrop}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            draggableAccessor={() => true}
            resizable={false}
            popup
          />
        </div>

        {/* Legend */}
        <div className="glass rounded-2xl p-4 border border-slate-200 dark:border-white/5 bg-white dark:bg-transparent">
          <div className="flex flex-wrap gap-4 items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-sm text-slate-600 dark:text-muted-foreground">Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
              <span className="text-sm text-slate-600 dark:text-muted-foreground">Projects</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
              <span className="text-sm text-slate-600 dark:text-muted-foreground">Daily Logs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Event Details Dialog */}
      {showDialog && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-md p-6 animate-fade-in bg-white dark:bg-slate-900">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: selectedEvent.resource.color + '20' }}
                >
                  <CalendarIcon className="w-5 h-5" style={{ color: selectedEvent.resource.color }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-foreground">{selectedEvent.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground capitalize">{selectedEvent.resource.type.replace('_', ' ')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-600 dark:text-white" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-muted-foreground mb-1">Date</p>
                <p className="text-sm text-slate-900 dark:text-foreground">
                  {format(selectedEvent.start, 'PPP')}
                  {selectedEvent.start.getTime() !== selectedEvent.end.getTime() && 
                    ` - ${format(selectedEvent.end, 'PPP')}`
                  }
                </p>
              </div>

              {selectedEvent.resource.type === 'task' && (
                <>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mb-1">Status</p>
                    <p className="text-sm text-slate-900 dark:text-foreground capitalize">
                      {(selectedEvent.resource.data as Task).status.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mb-1">Priority</p>
                    <p className="text-sm text-slate-900 dark:text-foreground capitalize">
                      {(selectedEvent.resource.data as Task).priority}
                    </p>
                  </div>
                </>
              )}

              {selectedEvent.resource.type === 'project' && (
                <>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mb-1">Status</p>
                    <p className="text-sm text-slate-900 dark:text-foreground capitalize">
                      {(selectedEvent.resource.data as Project).status.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-muted-foreground mb-1">Progress</p>
                    <p className="text-sm text-slate-900 dark:text-foreground">
                      {(selectedEvent.resource.data as Project).progress_percentage}%
                    </p>
                  </div>
                </>
              )}

              {selectedEvent.resource.type === 'daily_log' && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-muted-foreground mb-1">Summary</p>
                  <p className="text-sm text-slate-900 dark:text-foreground">
                    {(selectedEvent.resource.data as DailyLog).summary || 'No summary'}
                  </p>
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  onClick={() => {
                    const route = selectedEvent.resource.type === 'task' ? '/tasks' : 
                                  selectedEvent.resource.type === 'project' ? '/projects' : '/daily-log'
                    window.location.href = route
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Details
                </button>
                <button
                  onClick={() => setShowDialog(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-foreground font-semibold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
