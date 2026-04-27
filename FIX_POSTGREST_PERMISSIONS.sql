-- ============================================================================
-- CRITICAL FIX: PostgREST Schema Cache & Permissions
-- ============================================================================
-- This fixes PGRST205 errors by granting proper permissions to PostgREST roles
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- Step 1: Grant schema usage to PostgREST roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Step 2: Grant table permissions
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.projects TO anon, authenticated;
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.sub_projects TO anon, authenticated;
GRANT ALL ON public.daily_logs TO anon, authenticated;
GRANT ALL ON public.notes TO anon, authenticated;

-- Step 3: Grant sequence permissions (for auto-increment/serial columns)
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Step 4: Grant function execution permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Step 5: Notify PostgREST to reload schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Step 6: Verify permissions
SELECT 
  schemaname,
  tablename,
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE schemaname = 'public'
  AND grantee IN ('anon', 'authenticated')
ORDER BY tablename, grantee, privilege_type;

-- ============================================================================
-- EXPECTED OUTPUT:
-- ============================================================================
-- You should see multiple rows showing:
-- - schemaname: public
-- - tablename: profiles, projects, tasks, sub_projects, daily_logs, notes
-- - grantee: anon, authenticated
-- - privilege_type: INSERT, SELECT, UPDATE, DELETE, etc.
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING:
-- ============================================================================
-- If you still get PGRST205 errors after running this:
-- 1. Wait 10 seconds for schema cache to refresh
-- 2. Restart your Supabase project (Dashboard → Settings → Pause → Resume)
-- 3. Run: SELECT pg_notify('pgrst', 'reload schema'); again
-- ============================================================================
