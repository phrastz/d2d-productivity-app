-- Migration: Add Sub Projects to Project Hierarchy
-- This creates a 3-level hierarchy: Project → Sub Projects → Tasks

-- Step 1: Drop existing foreign key constraint on tasks.project_id if it exists
-- (We'll keep the column but make it work with the new hierarchy)
-- Note: Tasks can now belong to either a project directly OR to a sub_project

-- Step 2: Create sub_projects table
CREATE TABLE sub_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
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

-- Step 3: Add sub_project_id to tasks (nullable = task can belong directly to project OR to a sub_project)
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS sub_project_id UUID REFERENCES sub_projects(id) ON DELETE CASCADE;

-- Step 4: RLS policies for sub_projects
ALTER TABLE sub_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sub_projects" ON sub_projects
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sub_projects" ON sub_projects
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sub_projects" ON sub_projects
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sub_projects" ON sub_projects
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Step 5: Enable Realtime for sub_projects
ALTER PUBLICATION supabase_realtime ADD TABLE sub_projects;

-- Step 6: Create indexes for performance
CREATE INDEX idx_sub_projects_project_id ON sub_projects(project_id);
CREATE INDEX idx_sub_projects_owner_id ON sub_projects(owner_id);
CREATE INDEX idx_tasks_sub_project_id ON tasks(sub_project_id);

-- Step 7: Add updated_at trigger for sub_projects
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sub_projects_updated_at BEFORE UPDATE ON sub_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE sub_projects IS 'Sub-projects within a parent project for better organization';
COMMENT ON COLUMN sub_projects.order_index IS 'Used for custom ordering of sub-projects within a project';
COMMENT ON COLUMN tasks.sub_project_id IS 'Optional: Task can belong to a sub-project. If NULL, task belongs directly to project';
