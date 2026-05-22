-- Migration 017: Fix daily_logs RLS policies to use owner_id (not user_id)
-- The table uses 'owner_id' but policies were likely written against 'user_id'.
-- Also ensures the UNIQUE constraint on (owner_id, date) exists for upsert.
-- Run this in Supabase SQL Editor.

-- ============================================================
-- 1. Drop old policies (in case they reference user_id)
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own logs"    ON public.daily_logs;
DROP POLICY IF EXISTS "Users can insert their own logs"  ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update their own logs"  ON public.daily_logs;
DROP POLICY IF EXISTS "Users can delete their own logs"  ON public.daily_logs;

-- Also drop any legacy policy names that may have been created manually
DROP POLICY IF EXISTS "Allow individual read access"    ON public.daily_logs;
DROP POLICY IF EXISTS "Allow individual insert access"  ON public.daily_logs;
DROP POLICY IF EXISTS "Allow individual update access"  ON public.daily_logs;
DROP POLICY IF EXISTS "Allow individual delete access"  ON public.daily_logs;

-- ============================================================
-- 2. Re-create RLS policies using owner_id
-- ============================================================
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
  ON public.daily_logs FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own logs"
  ON public.daily_logs FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own logs"
  ON public.daily_logs FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================
-- 3. Ensure UNIQUE constraint on (owner_id, date) exists
--    Required for upsert with onConflict: 'owner_id,date'
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'daily_logs'
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%owner_id%date%'
  ) THEN
    ALTER TABLE public.daily_logs
      ADD CONSTRAINT daily_logs_owner_id_date_key UNIQUE (owner_id, date);
  END IF;
END $$;

-- ============================================================
-- 4. Verify (uncomment to run)
-- ============================================================
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'daily_logs';

-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_schema = 'public' AND table_name = 'daily_logs';
