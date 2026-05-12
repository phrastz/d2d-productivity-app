-- Migration 013: Add timeline fields to projects table
-- Adds start_date, end_date (safe IF NOT EXISTS), and timeline_change_reason

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS timeline_change_reason TEXT;

COMMENT ON COLUMN public.projects.start_date IS 'Project start date used for Gantt timeline display';
COMMENT ON COLUMN public.projects.end_date IS 'Project target completion date used for Gantt timeline display';
COMMENT ON COLUMN public.projects.timeline_change_reason IS 'Reason for the most recent change to project dates or status';

CREATE INDEX IF NOT EXISTS idx_projects_dates
  ON public.projects(start_date, end_date)
  WHERE start_date IS NOT NULL OR end_date IS NOT NULL;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');
