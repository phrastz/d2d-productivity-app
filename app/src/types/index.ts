export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'archived'
export type SubProjectStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed'
export type SubProjectPriority = 'low' | 'medium' | 'high'
export type Mood = 'great' | 'good' | 'okay' | 'bad' | 'terrible'

export interface Profile {
  id: string
  user_id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Project {
  id: string
  owner_id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  status: ProjectStatus
  progress_percentage: number
  created_at: string
  // Computed fields (not in database)
  sub_projects?: SubProject[]
  progress?: number
  tasks_total?: number
  tasks_done?: number
}

export interface SubProject {
  id: string
  project_id: string
  name: string
  description: string | null
  status: SubProjectStatus
  priority: SubProjectPriority
  order_index: number
  owner_id: string
  created_at: string
  updated_at: string
  // Computed fields (not in database)
  tasks?: Task[]
  progress?: number
  tasks_total?: number
  tasks_done?: number
}

export interface Task {
  id: string
  owner_id: string
  project_id: string | null
  sub_project_id: string | null
  title: string
  description: string | null
  due_date: string | null
  priority: TaskPriority
  status: TaskStatus
  time_spent_minutes: number
  is_habit: boolean
  habit_category: string | null
  created_at: string
}

export interface DailyLog {
  id: string
  user_id: string
  date: string
  summary: string | null
  mood: Mood | null
  created_at: string
}

export interface WeeklyReport {
  totalHoursWorked: number
  tasksCompleted: number
  topCategories: { name: string; count: number }[]
  dailyCompletions: { day: string; completed: number; total: number }[]
  moodTrend: { date: string; mood: string }[]
}

export interface Note {
  id: string
  owner_id: string
  project_id: string | null
  task_id: string | null
  content: string
  created_at: string
}
