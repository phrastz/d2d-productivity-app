# 🚨 EMERGENCY: Database Setup from Scratch

## Problem
Your Supabase database is completely empty. All tables need to be created.

---

## ✅ SOLUTION: One-File Complete Setup

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your **D2D Tracking** project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

### Step 2: Copy the Complete Setup SQL
Open the file: **`COMPLETE_DATABASE_SETUP.sql`**

This file contains:
- ✅ All 4 core tables (profiles, projects, tasks, daily_logs)
- ✅ Notes table (migration 001)
- ✅ Habit tracking columns (migration 002)
- ✅ Sub-projects table (migration 003)
- ✅ All RLS policies
- ✅ All indexes
- ✅ All triggers
- ✅ Realtime enabled

### Step 3: Run the SQL
1. Copy the **ENTIRE** content of `COMPLETE_DATABASE_SETUP.sql`
2. Paste into Supabase SQL Editor
3. Click **"Run"** (or press Ctrl+Enter / Cmd+Enter)
4. Wait for "Success" message

### Step 4: Verify Setup
Run this verification query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- ✅ daily_logs
- ✅ notes
- ✅ profiles
- ✅ projects
- ✅ sub_projects
- ✅ tasks

---

## 📋 Database Schema Overview

### Core Tables

#### 1. **profiles**
- User profile information
- Auto-created when user signs up
- Links to auth.users

#### 2. **projects**
- Main projects container
- Has name, description, dates, status, progress
- Owner-based RLS

#### 3. **tasks**
- Individual tasks/todos
- Can belong to a project OR sub-project
- Supports habits (is_habit, habit_category)
- Has priority, status, due_date, time tracking

#### 4. **sub_projects**
- Sub-projects within a project
- Creates 3-level hierarchy: Project → Sub-Project → Task
- Has status, priority, order_index

#### 5. **daily_logs**
- Daily journal entries
- Has date, summary, mood

#### 6. **notes**
- Comments/notes on projects or tasks
- Can be standalone notes too

---

## 🔒 Security Features

All tables have:
- ✅ Row Level Security (RLS) enabled
- ✅ Policies for SELECT, INSERT, UPDATE, DELETE
- ✅ User can only access their own data
- ✅ Foreign key constraints for data integrity

---

## 🔄 Realtime Features

All tables are enabled for Supabase Realtime:
- ✅ Live updates when data changes
- ✅ No polling needed
- ✅ Instant UI updates

---

## 📊 Indexes for Performance

Optimized indexes on:
- ✅ Foreign keys (project_id, task_id, etc.)
- ✅ Owner/user IDs
- ✅ Habit queries
- ✅ Date-based queries
- ✅ Created_at timestamps

---

## 🎯 What Happens After Running the SQL

1. **All tables created** with proper schema
2. **RLS policies applied** for security
3. **Indexes created** for fast queries
4. **Triggers set up** for auto-profile creation
5. **Realtime enabled** for live updates
6. **Your app will work immediately!**

---

## 🐛 Troubleshooting

### "relation already exists" errors
- ✅ This is OK! The SQL uses `IF NOT EXISTS` clauses
- ✅ It's safe to run multiple times
- ✅ Existing data won't be affected

### "permission denied" errors
- ❌ Make sure you're logged into the correct Supabase project
- ❌ Verify you have owner/admin access

### Tables still not showing
- Try refreshing the Supabase Dashboard
- Check the "Table Editor" tab
- Run the verification query above

---

## 📁 Individual SQL Files (if needed)

If you prefer to run migrations separately:

1. **`supabase_schema.sql`** - Initial schema (profiles, projects, tasks, daily_logs)
2. **`migrations/001_create_notes_table.sql`** - Notes table
3. **`migrations/002_add_habit_columns.sql`** - Habit tracking
4. **`migrations/003_add_subprojects.sql`** - Sub-projects hierarchy

Run them in this order.

---

## ⏱️ Estimated Time

**Total time: 30 seconds**
- Copy SQL: 5 seconds
- Paste: 5 seconds
- Run: 10 seconds
- Verify: 10 seconds

---

## ✅ After Setup Checklist

- [ ] All 6 tables exist in database
- [ ] RLS policies are active
- [ ] Realtime is enabled
- [ ] Restart your dev server: `npm run dev`
- [ ] Test login and create a project
- [ ] Verify data appears in Supabase Table Editor

---

**Need help?** Check the individual SQL files for detailed comments on each table and migration.
