-- Migration 014: Fix notes realtime publication + verify RLS SELECT policy
-- Run this in Supabase SQL Editor if notes are not appearing in ProjectNotesSection

-- ============================================================
-- 1. Add notes table to supabase_realtime publication
--    (required for postgres_changes events to fire in the client)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;

-- ============================================================
-- 2. Verify realtime is enabled (run this SELECT to confirm)
-- ============================================================
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';

-- ============================================================
-- 3. Re-assert RLS SELECT policy so it is definitely active
--    auth.uid() = owner_id means the logged-in user sees only
--    their own notes — this is the correct filter.
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = owner_id);

-- ============================================================
-- 4. Diagnostic queries — run these manually to confirm data
-- ============================================================
-- Check notes exist and have correct fields:
-- SELECT id, content, project_id, task_id, owner_id, follow_up_status, created_at
-- FROM notes
-- ORDER BY created_at DESC LIMIT 20;

-- Count notes by project_id and owner_id:
-- SELECT project_id, owner_id, COUNT(*) as note_count
-- FROM notes
-- GROUP BY project_id, owner_id
-- ORDER BY note_count DESC;

-- Confirm your auth.uid() matches note owner_id:
-- SELECT auth.uid();
