-- ============================================================================
-- D2D TRACKING - COMPLETE DATABASE SETUP
-- ============================================================================
-- This file contains ALL database schema and migrations in the correct order.
-- Run this ONCE in Supabase SQL Editor to set up the entire database.
-- 
-- Order of execution:
--   1. Initial Schema (profiles, projects, tasks, daily_logs)
--   2. Migration 001 - Notes table
--   3. Migration 002 - Habit tracking columns
--   4. Migration 003 - Sub-projects hierarchy
-- 
-- Safe to run multiple times (uses IF NOT EXISTS where possible)
-- ============================================================================

-- ============================================================================
-- PART 1: INITIAL SCHEMA
-- ============================================================================

-- 1. Create Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  status text DEFAULT 'active',
  progress_percentage integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  priority text DEFAULT 'medium',
  status text DEFAULT 'todo',
  time_spent_minutes integer DEFAULT 0,
  is_habit boolean DEFAULT false,
  category text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Daily Logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  summary text,
  mood text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Projects Policies
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;
CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);

-- Tasks Policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON public.tasks;
CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;
CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = owner_id);

-- Daily Logs Policies
DROP POLICY IF EXISTS "Users can view their own daily logs" ON public.daily_logs;
CREATE POLICY "Users can view their own daily logs"
  ON public.daily_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own daily logs" ON public.daily_logs;
CREATE POLICY "Users can insert their own daily logs"
  ON public.daily_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own daily logs" ON public.daily_logs;
CREATE POLICY "Users can update their own daily logs"
  ON public.daily_logs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own daily logs" ON public.daily_logs;
CREATE POLICY "Users can delete their own daily logs"
  ON public.daily_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- PART 2: MIGRATION 001 - NOTES TABLE
-- ============================================================================

-- Create Notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Constraint: A note must belong to either a project OR a task (or neither for standalone notes)
  CONSTRAINT note_belongs_to_project_or_task CHECK (
    (project_id IS NOT NULL AND task_id IS NULL) OR
    (project_id IS NULL AND task_id IS NOT NULL) OR
    (project_id IS NULL AND task_id IS NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notes_project_id ON public.notes(project_id);
CREATE INDEX IF NOT EXISTS idx_notes_task_id ON public.notes(task_id);
CREATE INDEX IF NOT EXISTS idx_notes_owner_id ON public.notes(owner_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own notes" ON public.notes;
CREATE POLICY "Users can insert their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;
CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- PART 3: MIGRATION 002 - HABIT TRACKING COLUMNS
-- ============================================================================

-- Add is_habit column (if not exists)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS is_habit BOOLEAN DEFAULT false;

-- Add habit_category column (renamed from category to be more specific)
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS habit_category TEXT;

-- Create index for faster habit queries
CREATE INDEX IF NOT EXISTS idx_tasks_is_habit 
ON public.tasks(is_habit) 
WHERE is_habit = true;

-- Create index for habit completions by date
CREATE INDEX IF NOT EXISTS idx_tasks_habit_done_date 
ON public.tasks(is_habit, status, due_date) 
WHERE is_habit = true AND status = 'done';

-- Add comments
COMMENT ON COLUMN public.tasks.is_habit IS 'Indicates if this task is a recurring habit';
COMMENT ON COLUMN public.tasks.habit_category IS 'Category for habits: Health, Learning, Work, Personal, etc.';

-- ============================================================================
-- PART 4: MIGRATION 003 - SUB-PROJECTS HIERARCHY
-- ============================================================================

-- Create sub_projects table
CREATE TABLE IF NOT EXISTS public.sub_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started' 
    CHECK (status IN ('not_started','in_progress','on_hold','completed')),
  priority TEXT DEFAULT 'medium' 
    CHECK (priority IN ('low','medium','high')),
  order_index INTEGER DEFAULT 0,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add sub_project_id to tasks (nullable = task can belong directly to project OR to a sub_project)
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS sub_project_id UUID REFERENCES public.sub_projects(id) ON DELETE CASCADE;

-- Enable RLS for sub_projects
ALTER TABLE public.sub_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for sub_projects
DROP POLICY IF EXISTS "Users can view own sub_projects" ON public.sub_projects;
CREATE POLICY "Users can view own sub_projects" ON public.sub_projects
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own sub_projects" ON public.sub_projects;
CREATE POLICY "Users can insert own sub_projects" ON public.sub_projects
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own sub_projects" ON public.sub_projects;
CREATE POLICY "Users can update own sub_projects" ON public.sub_projects
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own sub_projects" ON public.sub_projects;
CREATE POLICY "Users can delete own sub_projects" ON public.sub_projects
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_id = auth.uid()
    )
  );

-- Enable Realtime for sub_projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.sub_projects;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_projects_project_id ON public.sub_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_sub_projects_owner_id ON public.sub_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sub_project_id ON public.tasks(sub_project_id);

-- Add updated_at trigger for sub_projects
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sub_projects_updated_at ON public.sub_projects;
CREATE TRIGGER update_sub_projects_updated_at BEFORE UPDATE ON public.sub_projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.sub_projects IS 'Sub-projects within a parent project for better organization';
COMMENT ON COLUMN public.sub_projects.order_index IS 'Used for custom ordering of sub-projects within a project';
COMMENT ON COLUMN public.tasks.sub_project_id IS 'Optional: Task can belong to a sub-project. If NULL, task belongs directly to project';

-- ============================================================================
-- ENABLE REALTIME FOR ALL TABLES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- All tables, policies, triggers, and indexes have been created.
-- Your D2D Tracking database is ready to use!
-- ============================================================================
