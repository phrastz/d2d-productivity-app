# DailyFlow Pro — Antigravity Handoff (Updated)
**Date:** 29 April 2026

---

## Project Overview
Productivity web app combining Notion (project planning) + TickTick (daily tasks).
- **Framework:** Next.js 14 App Router + TypeScript + Tailwind CSS
- **Database:** Supabase (migrated to Singapore ap-southeast-1)
- **UI:** Shadcn/UI + Lucide React + Recharts + dnd-kit
- **Deploy:** Vercel + GitHub auto-deploy
- **Production URL:** https://d2d-productivity-app.vercel.app

---

## Database Status (Post-Migration)
- **Old DB:** Tokyo (ap-northeast-1) — DO NOT DELETE before 1 May 2026
- **New DB:** Singapore (ap-southeast-1) — ACTIVE
- **Migration done:** 29 April 2026 by Qwen + Antigravity
- **"Auto expose tables"** enabled in Supabase API settings — prevents future PGRST205

### Tables in Singapore DB
- `profiles` — auto-created on user signup via trigger
- `projects` — main project container
- `sub_projects` — sub-projects within project (source of original bug, now fixed)
- `tasks` — tasks (can belong to project directly or sub_project)
- `daily_logs` — daily journal entries
- `notes` — comments on projects/tasks

### Vercel Env Vars (already updated)
- `NEXT_PUBLIC_SUPABASE_URL` — Singapore endpoint (no /rest/v1/ suffix)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Singapore anon key

---

## DONE — Features Complete

| Feature | Status |
|---------|--------|
| Auth — login, register, reset password | ✅ Working |
| Dashboard with today's tasks & active projects | ✅ Working |
| Kanban board with drag & drop | ✅ Working |
| Gantt / timeline view | ✅ Working |
| Analytics & reports | ✅ Working |
| Realtime sync via Supabase WebSocket | ✅ Working |
| PWA — installable on mobile/desktop | ✅ Working |
| Calendar view with drag & drop reschedule | ✅ Working |
| Habit tracker — Github-style heatmap | ✅ Working |
| Project → Sub Project → Tasks hierarchy (code) | ✅ Code done |
| TypeScript build — all errors fixed | ✅ Done |
| Vercel production deployment | ✅ Live |

---

## PENDING — Needs Testing & Fixing

### 1. Sub-Project Creation (HIGH PRIORITY)
**Status:** Testing locally — not yet confirmed working post-migration

**What to test:**
1. Run app locally (`npm run dev`)
2. Login → open any project → click "+ Add Sub Project"
3. Enter name → click Create
4. Check if sub-project appears

**If still PGRST205 after Singapore migration:**
```sql
-- Run in Supabase SQL Editor (Singapore project)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.sub_projects TO anon, authenticated;
SELECT pg_notify('pgrst', 'reload schema');
```

### 2. owner_id Issue (MEDIUM PRIORITY)
**Symptom:** Project or sub-project created successfully (201 response)
but disappears after refresh or doesn't appear in list.

**How to debug:**
1. Open browser DevTools → Network tab
2. Create a project or sub-project
3. Check POST request payload — does it include `owner_id`?
4. Check Supabase Table Editor — does the row exist in the table?
5. If row exists but UI shows empty → RLS policy issue or `owner_id` mismatch
6. If row does NOT exist → insert payload missing `owner_id`

**RLS check in SQL Editor:**
```sql
-- Verify policies exist
SELECT policyname, cmd FROM pg_policies
WHERE tablename IN ('projects', 'sub_projects')
ORDER BY tablename, cmd;
```

**Expected policies for each table:**
- SELECT: `auth.uid() = owner_id`
- INSERT: `auth.uid() = owner_id`  
- UPDATE: `auth.uid() = owner_id`
- DELETE: `auth.uid() = owner_id`

---

## UPCOMING FEATURES (After CRUD Stable)

### Phase 3 — Light/Dark Mode Toggle
```
1. Install next-themes
2. Wrap app/layout.tsx:
   <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
3. tailwind.config.ts must have darkMode: 'class'
4. Create ThemeToggle (Shadcn DropdownMenu):
   - Options: Light, Dark, System
   - Icons: Sun, Moon, Monitor (lucide-react)
   - Place in top-right Navbar
5. Audit all components for Light Mode (Cards, Inputs, Tables, Calendar, Habits)
```

### Phase 4 — AI Daily Briefing
```
1. Server Action: generateDailyBriefing(userId)
   - Fetch today's tasks, overdue, upcoming deadlines, habit streaks
   - Call Anthropic API (ANTHROPIC_API_KEY in .env)
   - Prompt: friendly morning briefing max 150 words
     (top 3 priorities, overdue warnings, habit encouragement)
2. AIBriefingCard on Dashboard:
   - "Generate Morning Briefing" button
   - Loading skeleton while generating
   - Render markdown in glassmorphism card
   - Cache result per day
3. API key must stay server-side only
```

---

## Important Code Notes

- All hooks use `getSession()` NOT `getUser()` — prevents navigator lock contention
- Realtime subscriptions: tasks, projects, sub_projects
- Sub-project progress = weighted by task count per sub-project
- Direct tasks (no sub_project_id) also count toward project progress

## Key Files
```
src/hooks/useSubProjects.ts       — CRUD for sub_projects
src/hooks/useProjectDetail.ts     — fetches project + sub_projects + tasks
src/hooks/useRealtimeTasks.ts     — realtime subscription for tasks
src/hooks/useRealtimeProjects.ts  — realtime subscription for projects
src/components/projects/SubProjectCard.tsx  — UI component
src/app/(app)/projects/[id]/page.tsx        — project detail page
migrations/003_add_subprojects.sql          — migration reference
```

## User Notes
- User is on office laptop with Node.js download restrictions
- Moving to personal laptop for testing
- If "Invalid path" error appears again: check .env.local has no spaces/quotes
  and SUPABASE_URL has no /rest/v1/ suffix
