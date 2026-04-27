-- ============================================================================
-- VERIFY AUTHENTICATION SETUP
-- ============================================================================
-- Run this in Supabase SQL Editor to check if auth is configured correctly
-- ============================================================================

-- 1. Check if profiles table exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check if auto-profile creation trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 3. Check if the trigger function exists
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'handle_new_user';

-- 4. Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. Check if email confirmations are required (Supabase setting)
-- Note: This is a Supabase dashboard setting, not in database
-- Go to: Authentication → Settings → Email Auth
-- Check if "Enable email confirmations" is ON or OFF

-- 6. Test query: Count users in auth.users (should show existing users)
SELECT COUNT(*) as total_users FROM auth.users;

-- 7. Test query: Count profiles (should match auth.users count)
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Query 1: Should show 4 columns (id, user_id, full_name, avatar_url, created_at)
-- Query 2: Should show 1 trigger named 'on_auth_user_created'
-- Query 3: Should show 1 function named 'handle_new_user'
-- Query 4: Should show 3 policies (view, insert, update)
-- Query 6 & 7: Should have same count (every user should have a profile)
-- ============================================================================

-- ============================================================================
-- IF TRIGGER IS MISSING, RUN THIS TO RECREATE IT:
-- ============================================================================

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- COMMON ISSUES AND FIXES:
-- ============================================================================

-- ISSUE 1: Email confirmation required but not configured
-- FIX: Go to Supabase Dashboard → Authentication → Settings
--      Disable "Enable email confirmations" for testing
--      OR configure email templates properly

-- ISSUE 2: Trigger not firing
-- FIX: Run the trigger recreation SQL above

-- ISSUE 3: RLS blocking profile creation
-- FIX: The trigger uses SECURITY DEFINER which bypasses RLS

-- ISSUE 4: User created but no profile
-- FIX: Manually create profile:
-- INSERT INTO public.profiles (user_id, full_name)
-- SELECT id, raw_user_meta_data->>'full_name' 
-- FROM auth.users 
-- WHERE id NOT IN (SELECT user_id FROM public.profiles);

-- ============================================================================
