# 🚨 URGENT: Database Migration Required

## Problem
The app is showing errors because the `sub_projects` table doesn't exist in the database.

## Solution
Run the migration SQL in Supabase Dashboard (takes 30 seconds)

---

## Step-by-Step Instructions:

### 1. Open Supabase Dashboard
- Go to: https://supabase.com/dashboard
- Select your D2D Tracking project

### 2. Open SQL Editor
- Click **"SQL Editor"** in the left sidebar
- Click **"New query"**

### 3. Copy & Paste the SQL Below
Copy the ENTIRE SQL block below and paste it into the SQL Editor:

```sql
-- Migration 003: Add Sub Projects to Project Hierarchy
-- This creates a 3-level hierarchy: Project → Sub Projects → Tasks

-- Create sub_projects table
CREATE TABLE IF NOT EXISTS sub_projects (
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

-- Add sub_project_id to tasks
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS sub_project_id UUID REFERENCES sub_projects(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE sub_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own sub_projects" ON sub_projects;
CREATE POLICY "Users can view own sub_projects" ON sub_projects
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own sub_projects" ON sub_projects;
CREATE POLICY "Users can insert own sub_projects" ON sub_projects
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own sub_projects" ON sub_projects;
CREATE POLICY "Users can update own sub_projects" ON sub_projects
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own sub_projects" ON sub_projects;
CREATE POLICY "Users can delete own sub_projects" ON sub_projects
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sub_projects;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sub_projects_project_id ON sub_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_sub_projects_owner_id ON sub_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sub_project_id ON tasks(sub_project_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sub_projects_updated_at ON sub_projects;
CREATE TRIGGER update_sub_projects_updated_at BEFORE UPDATE ON sub_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE sub_projects IS 'Sub-projects within a parent project for better organization';
COMMENT ON COLUMN sub_projects.order_index IS 'Used for custom ordering of sub-projects within a project';
COMMENT ON COLUMN tasks.sub_project_id IS 'Optional: Task can belong to a sub-project. If NULL, task belongs directly to project';
```

### 4. Run the Query
- Click **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
- Wait for "Success. No rows returned" message

### 5. Verify
Run this verification query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'sub_projects';
```

You should see `sub_projects` in the results.

### 6. Restart Dev Server
```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

---

## ✅ After Migration

The following features will now work:
- ✅ Project detail page loads without errors
- ✅ Create sub-projects within projects
- ✅ Organize tasks under sub-projects
- ✅ View progress breakdown by sub-project
- ✅ Drag & drop reordering (visual ready)

---

## 🔍 Troubleshooting

**If you see "relation already exists" errors:**
- This is OK! It means parts of the migration already ran
- The `IF NOT EXISTS` and `DROP IF EXISTS` clauses handle this

**If you see permission errors:**
- Make sure you're logged into the correct Supabase project
- Check that you have owner/admin access

**If the table still doesn't exist:**
- Try running just the CREATE TABLE statement first
- Then run the rest of the SQL

---

## Alternative: Supabase CLI (if you have it installed)

```bash
# Link to your project (one-time setup)
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
npx supabase db push

# Or apply specific migration
npx supabase db execute --file migrations/003_add_subprojects.sql
```

---

**Estimated time: 30 seconds** ⏱️
