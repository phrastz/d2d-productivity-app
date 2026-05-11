-- Migration 011: Add all missing columns to the notes table
-- Safely adds project_id, task_id, and follow-up tracking columns
-- Safe to run multiple times (all ADD COLUMN use IF NOT EXISTS)
-- Run this directly in Supabase SQL Editor

-- ============================================================
-- 1. Add core linking columns (project_id, task_id)
-- ============================================================
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS task_id    UUID REFERENCES public.tasks(id)    ON DELETE CASCADE;

-- ============================================================
-- 2. Add follow-up tracking columns
-- ============================================================
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS follow_up_status TEXT    DEFAULT 'pending'
    CHECK (follow_up_status IN ('pending', 'in_progress', 'resolved')),
  ADD COLUMN IF NOT EXISTS follow_up_date   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_note   TEXT;

-- ============================================================
-- 3. Backfill: set any NULL follow_up_status rows to 'pending'
-- ============================================================
UPDATE public.notes
SET follow_up_status = 'pending'
WHERE follow_up_status IS NULL;

-- ============================================================
-- 4. Indexes (IF NOT EXISTS — safe to re-run)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_notes_project_id      ON public.notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_task_id          ON public.notes(task_id);
CREATE INDEX IF NOT EXISTS idx_notes_owner_id         ON public.notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at       ON public.notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_follow_up_status ON public.notes(follow_up_status);

-- ============================================================
-- 5. Ensure RLS is enabled
-- ============================================================
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. Recreate RLS policies (drop first so re-runs are safe)
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own notes"   ON public.notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;

CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================
-- 7. Force PostgREST to reload its schema cache
--    Run this LAST after all DDL above has committed
-- ============================================================
SELECT pg_notify('pgrst', 'reload schema');
