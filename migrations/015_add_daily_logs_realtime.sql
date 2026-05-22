-- Migration 015: Add daily_logs table to supabase_realtime publication
-- Required for the Daily Log page realtime subscription to receive INSERT/UPDATE/DELETE events
-- Run this in Supabase SQL Editor

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_logs;

-- Verify (uncomment to check):
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
-- ORDER BY tablename;
