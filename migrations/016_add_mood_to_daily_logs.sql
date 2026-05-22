-- Migration 016: Add mood column to daily_logs table
-- The daily_logs table was created manually in Supabase without a mood column.
-- This migration adds it to match the schema expected by the application.
--
-- Mood values used in the app: 'great' | 'good' | 'okay' | 'bad' | 'terrible'
-- Default is 'okay' (matches code default in daily-log/page.tsx and QuickAddFAB.tsx)
--
-- Run this in Supabase SQL Editor

ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS mood TEXT DEFAULT 'okay'
    CHECK (mood IN ('great', 'good', 'okay', 'bad', 'terrible'));

-- Backfill any existing rows that have NULL mood
UPDATE public.daily_logs
SET mood = 'okay'
WHERE mood IS NULL;

-- Reload PostgREST schema cache so the API recognises the new column immediately
SELECT pg_notify('pgrst', 'reload schema');

-- Verify (uncomment to check):
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'daily_logs'
-- ORDER BY ordinal_position;
