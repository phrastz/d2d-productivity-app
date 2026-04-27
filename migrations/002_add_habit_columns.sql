-- Migration: Add habit tracking columns to tasks table
-- This migration adds is_habit and habit_category columns if they don't exist

-- Add is_habit column
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT false;

-- Add habit_category column (renamed from category to be more specific)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS habit_category TEXT;

-- Create index for faster habit queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_habit 
ON tasks(is_habit) 
WHERE is_habit = true;

-- Create index for habit completions by date
CREATE INDEX IF NOT EXISTS idx_tasks_habit_done_date 
ON tasks(is_habit, status, due_date) 
WHERE is_habit = true AND status = 'done';

-- Add comment
COMMENT ON COLUMN tasks.is_habit IS 'Indicates if this task is a recurring habit';
COMMENT ON COLUMN tasks.habit_category IS 'Category for habits: Health, Learning, Work, Personal, etc.';
