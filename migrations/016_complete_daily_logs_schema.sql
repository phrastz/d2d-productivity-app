-- Migration 016: Complete daily_logs schema — add missing columns
-- The daily_logs table was created manually without 'summary' and 'mood' columns.
-- This migration safely adds both, backfills nulls, and reloads the schema cache.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS).

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT 'okay'
    CHECK (mood IN ('great', 'good', 'okay', 'bad', 'terrible'));

-- Backfill: set any existing NULL mood values to 'okay'
UPDATE public.daily_logs
SET mood = 'okay'
WHERE mood IS NULL;

-- Reload PostgREST schema cache so the API recognises the new columns immediately
SELECT pg_notify('pgrst', 'reload schema');

-- Verify (uncomment to check):
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'daily_logs'
-- ORDER BY ordinal_position;
