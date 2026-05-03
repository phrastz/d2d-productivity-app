export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
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
  updated_at: string
  status_changed_at?: string
  // Computed fields (not in database)
  sub_projects?: SubProject[]
  progress?: number
  tasks_total?: number
  tasks_done?: number
  // Effort tracking (computed)
  total_effort_estimate?: number
  total_actual_effort?: number
  efficiency_ratio?: number
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
  status_changed_at?: string
  // Fields added in migration (Step 1)
  progress_percent: number
  weight_contribution: number
  start_date: string | null
  end_date: string | null
  // NEW: Dependency tracking
  depends_on_subproject_id?: string
  
  // Computed from view (optional)
  depends_on_name?: string
  depends_on_status?: string
  can_start?: boolean
  
  // Computed/enriched at runtime (not persisted)
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
  updated_at: string
  // Fields added in migration (Step 1)
  progress_percent: number
  start_date: string | null
  end_date: string | null
  // Fields added in migration 005
  effort_estimate: number
  actual_effort: number
  effort_unit: 'hours' | 'days' | 'story_points'
  // Computed efficiency (calculated at runtime)
  efficiency_ratio?: number
  effort_variance?: number
  // Fields added in migration 006 - Backdate & Audit
  planned_completed_date?: string
  actual_completed_date?: string
  status_changed_at: string
  is_backdated_entry: boolean
  backdate_reason?: string
  // Blocker tracking
  blocker_reason?: string
  blocked_by?: string
  is_blocked: boolean
  // Computed (not in DB)
  time_variance_days?: number // calculated: actual - planned
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
  updated_at: string
}

// ============================================================================
// Effort Tracking Types
// ============================================================================

export interface EfficiencyMetrics {
  estimatedEffort: number
  actualEffort: number
  efficiencyRatio: number // (actual / estimate) * 100
  variance: number // actual - estimate
  status: 'under' | 'on_track' | 'over' // based on ratio
}

export interface ProjectEfficiency {
  totalEstimate: number
  totalActual: number
  overallRatio: number
  subProjectEfficiency: { id: string; name: string; ratio: number }[]
  onTrackTasks: number
  overEffortTasks: number
}
