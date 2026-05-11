-- Migration 009: Add follow-up tracking columns to notes table
-- Created: 2026-05-11

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'pending'
    CHECK (follow_up_status IN ('pending', 'in_progress', 'resolved')),
  ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_note TEXT;

-- Index for fast pending follow-up queries
CREATE INDEX IF NOT EXISTS idx_notes_follow_up_status ON public.notes(follow_up_status);

-- Backfill: set all existing notes to 'pending' (already the DEFAULT, but explicit)
UPDATE public.notes SET follow_up_status = 'pending' WHERE follow_up_status IS NULL;

-- Refresh PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');
