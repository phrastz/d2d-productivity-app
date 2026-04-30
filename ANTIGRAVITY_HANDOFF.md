# DailyFlow Pro — Handoff Summary for Antigravity
**Date:** 27 April 2026

---

## Project Overview

A productivity web app combining Notion (project planning) + TickTick (daily tasks).
Built with Next.js 14, Supabase, Shadcn/UI, deployed on Vercel.

**Production URL:** https://d2d-productivity-app.vercel.app
**GitHub:** main branch, latest commit ac87e5f → 44f17dd

---

## DONE — 100% Working

| Feature | Notes |
|---------|-------|
| Database schema + RLS | All tables created with proper Row Level Security |
| Auth — login, register, reset password | Working in production |
| Dashboard with today's tasks & active projects | Working |
| Kanban board with drag & drop | dnd-kit, working |
| Gantt / timeline view | Working |
| Analytics & reports page | Recharts, working |
| Realtime sync via Supabase WebSocket | useRealtimeTasks + useRealtimeProjects hooks |
| PWA — installable on mobile/desktop | manifest.json + next-pwa configured |
| Calendar view with drag & drop reschedule | react-big-calendar, working |
| Habit tracker — Github-style heatmap | Full year grid, streaks, stats |
| Project → Sub Project → Tasks hierarchy | Code 100% complete, DB blocked (see below) |
| TypeScript build — all errors fixed | habit_category fix, turbopack config |
| Vercel deployment | Build success, deployed to production |

---

## CRITICAL BUG — Sub Projects Not Working

### Error
```
PGRST205: Could not find the table 'public.sub_projects' in the schema cache
```

### Where it happens
- Production: https://d2d-productivity-app.vercel.app
- When clicking "+ Add Sub Project" inside any project detail page
- Also affects reading sub_projects (all 404)

### What was tried (all failed)
1. `NOTIFY pgrst, 'reload schema'` — ran multiple times, no effect
2. `SELECT pg_notify('pgrst', 'reload schema')` — same
3. DROP + recreate table — table confirmed exists via `SELECT COUNT(*) FROM public.sub_projects` returns 0
4. GRANT ALL ON public.sub_projects TO anon, authenticated — ran successfully
5. Pause + Resume Supabase project — did not fix
6. Delete .next cache + restart dev server — same error
7. Deploy to Vercel production — same error

### Root cause hypothesis
Supabase had a **global outage on 27 April 2026** (Database + Auth partial outage,
multiple regions). The sub_projects table was created during this outage period,
which may have caused it to not be properly registered in PostgREST schema cache
even though it exists in pg_tables.

### Verification
```sql
-- This returns 0 (table EXISTS in database)
SELECT COUNT(*) FROM public.sub_projects;

-- This returns: public | sub_projects (table EXISTS)
SELECT schemaname, tablename FROM pg_tables WHERE tablename = 'sub_projects';

-- But REST API returns 404 for all requests to /rest/v1/sub_projects
```

### What Antigravity needs to fix
The table exists in PostgreSQL but PostgREST cannot see it.
This is a PostgREST schema cache / exposure issue.

**Option 1 — Force PostgREST to expose the table:**
```sql
-- Make sure table is in the correct schema exposed to PostgREST
ALTER TABLE public.sub_projects SET SCHEMA public;

-- Ensure PostgREST has access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.sub_projects TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Force reload
SELECT pg_notify('pgrst', 'reload schema');
```

**Option 2 — Check if PostgREST exposed schemas includes public:**
In Supabase Dashboard → Settings → API → check "Exposed schemas" includes "public"

**Option 3 — Nuclear reset:**
```sql
DROP TABLE IF EXISTS public.sub_projects CASCADE;
-- Wait 30 seconds
-- Then recreate from scratch
CREATE TABLE public.sub_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'not_started',
  priority TEXT DEFAULT 'medium',
  order_index INTEGER DEFAULT 0,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.sub_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_all" ON public.sub_projects
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
GRANT ALL ON public.sub_projects TO anon, authenticated;
SELECT pg_notify('pgrst', 'reload schema');
```

---

## PENDING Features (after sub_projects fixed)

### Phase 3 — Light/Dark Mode Toggle
```
Install next-themes.
Wrap app/layout.tsx with ThemeProvider attribute="class" defaultTheme="system" enableSystem.
Confirm tailwind.config.ts has darkMode: 'class'.
Create ThemeToggle component using Shadcn DropdownMenu:
- Options: Light, Dark, System
- Icons: Sun, Moon, Monitor from lucide-react
- Place in top-right of TopNav
Audit ALL components for Light Mode compatibility.
Use getSession() pattern. Do not break PWA or Realtime.
```

### Phase 4 — AI Daily Briefing
```
Create Server Action generateDailyBriefing(userId):
- Fetch today's tasks, overdue, upcoming deadlines, habit streaks from Supabase
- Call Anthropic API (ANTHROPIC_API_KEY)
- Prompt: analyze user data, give friendly morning briefing max 150 words,
  cover top 3 priorities, overdue warnings, habit encouragement
- Stream response via Vercel AI SDK
Build AIBriefingCard on Dashboard:
- "Generate Morning Briefing" button
- Loading skeleton while generating
- Render markdown in glassmorphism card
- Cache result per day (don't regenerate on every refresh)
API key must stay server-side only.
```

---

## Tech Stack

- **Framework:** Next.js 14 App Router + TypeScript
- **Database:** Supabase (PostgreSQL + RLS + Realtime WebSocket)
- **UI:** Shadcn/UI + Tailwind CSS + Lucide React
- **Charts:** Recharts
- **Drag & Drop:** dnd-kit
- **Calendar:** react-big-calendar
- **PWA:** next-pwa
- **Deploy:** Vercel + GitHub auto-deploy

## Important Code Notes

- All hooks use `getSession()` not `getUser()` — prevents navigator lock contention
- Realtime subscriptions active on: tasks, projects, sub_projects
- Database tables: profiles, projects, tasks, sub_projects, daily_logs, notes
- All queries use graceful fallback for sub_projects (won't crash if table unavailable)

---

## Files Related to Sub Projects

- `src/hooks/useSubProjects.ts` — CRUD for sub_projects
- `src/hooks/useProjectDetail.ts` — fetches project + sub_projects + tasks
- `src/components/projects/SubProjectCard.tsx` — UI component
- `src/app/(app)/projects/[id]/page.tsx` — project detail page
- `migrations/003_add_subprojects.sql` — migration file
