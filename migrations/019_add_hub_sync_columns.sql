-- Migration 019: Add columns to support syncing Projects/Tasks from the Marketing Hub
-- Adds external_id/external_source to projects & tasks (for upsert-by-external-id sync),
-- plus parent_task_id on tasks to preserve hub subtask hierarchy.

-- Projects: track the originating hub project
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS external_source TEXT DEFAULT 'marketing_hub';

COMMENT ON COLUMN public.projects.external_id IS 'ID of the originating record in an external system (e.g. Marketing Hub project id). Used as the upsert key for sync.';
COMMENT ON COLUMN public.projects.external_source IS 'Name of the external system that owns this synced record (e.g. marketing_hub).';

-- Only one D2D project may map to a given external record
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_external_id
  ON public.projects(external_id)
  WHERE external_id IS NOT NULL;

-- Tasks: track the originating hub task + preserve subtask hierarchy
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS external_source TEXT DEFAULT 'marketing_hub';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tasks.external_id IS 'ID of the originating record in an external system (e.g. Marketing Hub task id). Used as the upsert key for sync.';
COMMENT ON COLUMN public.tasks.external_source IS 'Name of the external system that owns this synced record (e.g. marketing_hub).';
COMMENT ON COLUMN public.tasks.parent_task_id IS 'Optional parent task, used to mirror subtask hierarchy from an external system.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_external_id
  ON public.tasks(external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id
  ON public.tasks(parent_task_id)
  WHERE parent_task_id IS NOT NULL;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');
