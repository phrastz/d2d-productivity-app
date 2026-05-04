-- ============================================================================
-- MIGRATION 005: Add Effort Tracking and Missing Columns
-- ============================================================================
-- This migration adds effort tracking to tasks and verifies date columns
-- Run this in Supabase SQL Editor to complete the schema
-- ============================================================================

-- ============================================================================
-- PART 1: Add Effort Tracking to Tasks
-- ============================================================================

-- Estimated effort for planning
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS effort_estimate INTEGER DEFAULT 0;

-- Actual effort spent
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS actual_effort INTEGER DEFAULT 0;

-- Unit of measurement (hours, days, story_points)
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS effort_unit TEXT DEFAULT 'hours';

-- Constraint to ensure valid units
ALTER TABLE public.tasks 
  ADD CONSTRAINT valid_effort_unit CHECK (effort_unit IN ('hours', 'days', 'story_points'));

-- Index for performance on effort queries
CREATE INDEX IF NOT EXISTS idx_tasks_effort 
  ON public.tasks(effort_estimate, actual_effort) 
  WHERE effort_estimate > 0 OR actual_effort > 0;

-- Index for filtering by effort unit
CREATE INDEX IF NOT EXISTS idx_tasks_effort_unit 
  ON public.tasks(effort_unit);

-- Add comments for documentation
COMMENT ON COLUMN public.tasks.effort_estimate IS 'Estimated effort required to complete the task';
COMMENT ON COLUMN public.tasks.actual_effort IS 'Actual effort spent on the task';
COMMENT ON COLUMN public.tasks.effort_unit IS 'Unit of effort: hours, days, or story_points';

-- ============================================================================
-- PART 2: Verify Sub-Project Date Columns
-- ============================================================================

-- Add start_date if missing
ALTER TABLE public.sub_projects 
  ADD COLUMN IF NOT EXISTS start_date DATE;

-- Add end_date if missing
ALTER TABLE public.sub_projects 
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_subprojects_dates 
  ON public.sub_projects(start_date, end_date) 
  WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.sub_projects.start_date IS 'Planned start date for the sub-project';
COMMENT ON COLUMN public.sub_projects.end_date IS 'Planned end date for the sub-project';

-- ============================================================================
-- PART 3: Add Project Updated Timestamp
-- ============================================================================

-- Add updated_at if missing
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if exists (to avoid errors)
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;

-- Create trigger for projects
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON public.projects
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Also ensure sub_projects has the trigger
DROP TRIGGER IF EXISTS update_sub_projects_updated_at ON public.sub_projects;
CREATE TRIGGER update_sub_projects_updated_at 
  BEFORE UPDATE ON public.sub_projects
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON COLUMN public.projects.updated_at IS 'Last modification timestamp, auto-updated on change';

-- ============================================================================
-- PART 4: Grant Permissions
-- ============================================================================

-- Ensure authenticated users can use the new columns
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.sub_projects TO anon, authenticated;
GRANT ALL ON public.projects TO anon, authenticated;

-- ============================================================================
-- PART 5: Reload Schema Cache
-- ============================================================================

SELECT pg_notify('pgrst', 'reload schema');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
