-- Migration 018: Allow multiple daily log entries per day
-- Removes the one-per-day unique constraint on (owner_id, date)
-- and replaces it with a plain performance index.
-- Run this in the Supabase SQL Editor.

-- 1. Drop the unique constraint (safe if it doesn't exist)
ALTER TABLE public.daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_owner_id_date_key;

-- 2. Add a non-unique index for query performance
CREATE INDEX IF NOT EXISTS daily_logs_owner_id_date_idx
  ON public.daily_logs (owner_id, date);

-- 3. Verify (uncomment to check)
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'daily_logs';
