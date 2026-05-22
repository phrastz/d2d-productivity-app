-- Migration 000: daily_logs base table (documentation only)
-- This table was created manually in Supabase before migrations were tracked.
-- This file documents the original intended schema.
-- DO NOT re-run this if the table already exists — use IF NOT EXISTS for safety.

CREATE TABLE IF NOT EXISTS public.daily_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE        NOT NULL,
  summary    TEXT,
  mood       TEXT        DEFAULT 'okay'
               CHECK (mood IN ('great', 'good', 'okay', 'bad', 'terrible')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
  ON public.daily_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own logs"
  ON public.daily_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own logs"
  ON public.daily_logs FOR DELETE
  USING (auth.uid() = user_id);
