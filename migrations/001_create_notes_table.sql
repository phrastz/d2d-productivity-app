-- Migration: Create Notes Table for Comments/Notes on Tasks and Projects
-- Created: 2026-04-27

-- 1. Create Notes table
CREATE TABLE public.notes (
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

-- 2. Create indexes for better query performance
CREATE INDEX idx_notes_project_id ON public.notes(project_id);
CREATE INDEX idx_notes_task_id ON public.notes(task_id);
CREATE INDEX idx_notes_owner_id ON public.notes(owner_id);
CREATE INDEX idx_notes_created_at ON public.notes(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
CREATE POLICY "Users can view their own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = owner_id);
