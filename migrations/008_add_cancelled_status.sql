-- Migration 008: Add 'cancelled' status option to tasks
-- Date: May 3, 2026
-- Description: Add 'cancelled' as a valid task status to match full spec requirements

-- ============================================================================
-- STEP 1: Update status constraint on tasks table
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add updated constraint with 'cancelled' included
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled'));

-- ============================================================================
-- STEP 2: Update comment on status column for documentation
-- ============================================================================

COMMENT ON COLUMN tasks.status IS 
'Task status: todo (not started), in_progress (actively working), done (completed), cancelled (abandoned). 
Cancelled tasks are excluded from progress calculations.';

-- ============================================================================
-- STEP 3: Verify migration
-- ============================================================================

-- Test: Show current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'tasks'::regclass 
AND contype = 'c';
