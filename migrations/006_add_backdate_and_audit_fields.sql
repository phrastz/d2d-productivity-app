-- ============================================================================
-- MIGRATION 006: Backdate Handling & Advanced Audit Fields
-- ============================================================================
-- This migration adds backdate tracking and audit fields to tasks
-- Run this in Supabase SQL Editor to complete the schema
-- ============================================================================

-- ============================================================================
-- PART 1: Add Backdate and Audit Columns to Tasks
-- ============================================================================

-- Planned completion date (target deadline)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS planned_completed_date DATE;

-- Actual completion date (when it was really done)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_completed_date DATE;

-- Timestamp of last status change
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();

-- Flag for backdated entries (actual date < today when marked done)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_backdated_entry BOOLEAN DEFAULT FALSE;

-- Reason for backdating (audit trail)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS backdate_reason TEXT;

-- ============================================================================
-- PART 2: Add Blocker Tracking
-- ============================================================================

-- Reason why task is blocked
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS blocker_reason TEXT;

-- Reference to blocking task/issue
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS blocked_by TEXT;

-- Flag for blocked state
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- PART 3: Add Validation Constraints
-- ============================================================================

-- Constraint: actual_completed_date cannot be in future
ALTER TABLE public.tasks 
DROP CONSTRAINT IF EXISTS valid_actual_completed_date;

ALTER TABLE public.tasks 
ADD CONSTRAINT valid_actual_completed_date 
CHECK (actual_completed_date IS NULL OR actual_completed_date <= CURRENT_DATE);

-- Note: Cannot enforce 'done requires completion date' via CHECK alone
-- Implemented via trigger below

-- ============================================================================
-- PART 4: Create Status Change Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_task_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_changed_at = NOW();
        
        -- Auto-set actual_completed_date when status changes to 'done'
        IF NEW.status = 'done' AND NEW.actual_completed_date IS NULL THEN
            NEW.actual_completed_date = CURRENT_DATE;
        END IF;
        
        -- Auto-flag as backdated if actual date is in the past
        IF NEW.status = 'done' AND NEW.actual_completed_date < CURRENT_DATE THEN
            NEW.is_backdated_entry = TRUE;
        END IF;
    END IF;
    
    -- Also check if actual_completed_date was manually updated to past date
    IF NEW.actual_completed_date IS DISTINCT FROM OLD.actual_completed_date THEN
        IF NEW.actual_completed_date < CURRENT_DATE THEN
            NEW.is_backdated_entry = TRUE;
        ELSE
            NEW.is_backdated_entry = FALSE;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for status tracking
DROP TRIGGER IF EXISTS track_task_status_change ON public.tasks;
CREATE TRIGGER track_task_status_change
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_task_status_timestamp();

-- ============================================================================
-- PART 5: Add Indexes for Performance
-- ============================================================================

-- Index for backdated entries queries
CREATE INDEX IF NOT EXISTS idx_tasks_backdate ON public.tasks(is_backdated_entry) WHERE is_backdated_entry = TRUE;

-- Index for blocked tasks
CREATE INDEX IF NOT EXISTS idx_tasks_blocked ON public.tasks(is_blocked) WHERE is_blocked = TRUE;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_tasks_dates ON public.tasks(planned_completed_date, actual_completed_date);

-- Index for status change tracking
CREATE INDEX IF NOT EXISTS idx_tasks_status_changed ON public.tasks(status_changed_at);

-- Composite index for project-level metrics queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_dates ON public.tasks(project_id, actual_completed_date, planned_completed_date) 
WHERE status = 'done';

-- ============================================================================
-- PART 6: Add Status Tracking to Projects (Consistency)
-- ============================================================================

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
ALTER TABLE public.sub_projects ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;

-- Create function for project/subproject status tracking
CREATE OR REPLACE FUNCTION public.update_project_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_changed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate triggers
DROP TRIGGER IF EXISTS track_project_status_change ON public.projects;
CREATE TRIGGER track_project_status_change
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_project_status_timestamp();

DROP TRIGGER IF EXISTS track_subproject_status_change ON public.sub_projects;
CREATE TRIGGER track_subproject_status_change
BEFORE UPDATE ON public.sub_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_project_status_timestamp();

-- ============================================================================
-- PART 7: Grant Permissions
-- ============================================================================

GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.projects TO anon, authenticated;
GRANT ALL ON public.sub_projects TO anon, authenticated;

-- ============================================================================
-- PART 8: Reload Schema Cache
-- ============================================================================

SELECT pg_notify('pgrst', 'reload schema');

-- ============================================================================
-- PART 9: Verification
-- ============================================================================

SELECT 
    'Migration 006 Complete!' as status,
    COUNT(*) FILTER (WHERE column_name = 'planned_completed_date') as planned_date_exists,
    COUNT(*) FILTER (WHERE column_name = 'actual_completed_date') as actual_date_exists,
    COUNT(*) FILTER (WHERE column_name = 'status_changed_at') as status_changed_exists,
    COUNT(*) FILTER (WHERE column_name = 'is_backdated_entry') as backdate_flag_exists,
    COUNT(*) FILTER (WHERE column_name = 'blocker_reason') as blocker_reason_exists,
    COUNT(*) FILTER (WHERE column_name = 'is_blocked') as is_blocked_exists
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name IN (
    'planned_completed_date', 
    'actual_completed_date', 
    'status_changed_at',
    'is_backdated_entry',
    'backdate_reason',
    'blocker_reason',
    'blocked_by',
    'is_blocked'
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
