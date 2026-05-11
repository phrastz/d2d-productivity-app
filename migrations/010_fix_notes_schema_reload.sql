-- Migration 010: Fix PostgREST schema cache + reinforce notes RLS policies
-- Run this in Supabase SQL Editor after migration 009

-- 1. Re-confirm columns exist (safe to re-run)
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'pending'
    CHECK (follow_up_status IN ('pending', 'in_progress', 'resolved')),
  ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_note TEXT;

-- 2. Backfill any rows that got NULL (shouldn't happen, but safe to repeat)
UPDATE public.notes
SET follow_up_status = 'pending'
WHERE follow_up_status IS NULL;

-- 3. Recreate RLS policies explicitly to cover all columns including new ones
--    (Postgres RLS is row-level not column-level, but drop+recreate ensures
--     no stale policy state that could reject writes to new columns)

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

-- WITH CHECK added so updates to new columns pass the policy check
CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = owner_id);

-- 4. Force PostgREST to reload its schema cache
--    This is the critical step — run this LAST
NOTIFY pgrst, 'reload schema';
