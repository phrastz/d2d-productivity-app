# 🚀 DailyFlow Pro — Windsurf Handoff Document
> Copy & paste this entire document as your first message to Windsurf.

---

## 📌 Project Context

You are continuing development of **DailyFlow Pro**, a productivity web app that combines:
- **Notion-style** project planning (database, timeline, Gantt chart)
- **TickTick-style** daily task management (habits, quick add, daily log)

The MVP was built using **Antigravity AI Coding Agent** and is already live. You are now picking up where Antigravity left off.

---

## ✅ What Has Already Been Completed (100% Done)

| Feature | Status |
|---|---|
| Supabase Database Schema (tables: `profiles`, `projects`, `tasks`, `daily_logs`) | ✅ Done |
| Row Level Security (RLS) policies on all tables | ✅ Done |
| Authentication (Login, Register, Reset Password) | ✅ Done |
| Dashboard with Today's Tasks & Active Projects widgets | ✅ Done |
| Kanban Board (drag & drop using dnd-kit) | ✅ Done |
| Projects Timeline / Gantt Chart view | ✅ Done |
| Daily Log & Quick Add FAB (Floating Action Button) | ✅ Done |
| Analytics / Reports page with Recharts | ✅ Done |
| Dark Mode + Glassmorphism UI | ✅ Done |
| Deployed live to Vercel | ✅ Done |
| **Supabase Realtime Sync** (WebSocket hooks: `useRealtimeTasks`, `useRealtimeProjects`) | ✅ Done |
| **PWA (Progressive Web App)** — installable on mobile/desktop | ✅ Done |
| App Logo / Icon assets in `/public/icons/` | ✅ Done |

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL + RLS + Realtime WebSockets)
- **UI:** Shadcn/UI + Tailwind CSS + Lucide React icons
- **Charts:** Recharts
- **Drag & Drop:** dnd-kit
- **State:** TanStack Query + Zustand
- **Deployment:** Vercel + GitHub (auto-deploy on push)
- **PWA:** next-pwa + manifest.json

---

## 📋 Pending Features — Execute in This Order

### PHASE 1 — Calendar View (START HERE)

**Goal:** A dedicated `/calendar` page showing all Tasks, Projects, and Daily Logs in monthly/weekly format with drag-and-drop date rescheduling.

```
Task: Implement Interactive Calendar View with Drag & Drop

Instructions:
1. Install react-big-calendar (or fullcalendar-react) and date-fns.
2. Create data fetching function from Supabase:
   - tasks (use due_date as event date)
   - projects (use start_date to end_date as range)
   - daily_logs (use date field)
   - Map to calendar event format: { title, start, end, resourceType, bgColor }
   - Colors: Blue = tasks, Purple = projects, Green = daily_logs
3. Build CalendarPage at route /calendar:
   - Support Month View and Week View
   - Custom CSS to match existing Dark Mode / Glassmorphism theme
4. Drag & Drop:
   - On onEventDrop: call Supabase update to change due_date (tasks) or start_date (projects)
   - Show success toast on update
   - This must trigger existing Realtime Sync (useRealtimeTasks / useRealtimeProjects hooks)
5. Click event: open Shadcn Dialog modal showing event details + edit link
6. Add "Calendar" link to main sidebar navigation
```

---

### PHASE 2 — Habit Tracker Grid (Github-style Heatmap)

**Goal:** A dedicated page with a contribution-graph style heatmap showing daily habit consistency.

```
Task: Create Github-Style Habit Tracker Heatmap

Instructions:
1. Confirm the tasks table has an is_habit boolean column. If not, generate the SQL migration.
2. Create aggregation query: count completed habits per day for the past 12 months.
   Format: { date: 'YYYY-MM-DD', count: number }
3. Build HabitHeatmap component:
   - 7-column grid (days) x ~52 rows (weeks) = full year view
   - Color intensity: gray (0) → light green (1) → dark green (2+)
   - Hover tooltip: show date + habit names completed
4. Stats row above grid:
   - "Current Streak", "Longest Streak", "Total Completions This Year"
5. "Today's Habits" section below the grid:
   - Checkbox list of active habits (tasks where is_habit = true)
   - Checking off updates the task status in Supabase
6. Style with glow effect for completed days, matching Dark Mode theme
```

---

### PHASE 3 — Light / Dark Mode Toggle

**Goal:** Replace hardcoded Dark Mode with a dynamic theme system.

```
Task: Implement Light/Dark/System Theme Toggle

Instructions:
1. Install next-themes
2. Wrap app/layout.tsx with <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
3. Confirm tailwind.config.ts has darkMode: 'class'
4. Create ThemeToggle component (Shadcn DropdownMenu with Sun/Moon/Monitor icons)
   - Options: Light, Dark, System
   - Place in top-right Navbar or User Profile menu
5. Audit all major components for Light Mode compatibility:
   - Cards, Inputs, Modals, Sidebar, Calendar, Habit Grid, Tables
   - Ensure Tailwind dark: variants are set correctly
   - Check text contrast and border visibility in Light Mode
```

---

### PHASE 4 — AI Daily Briefing (Final Feature)

**Goal:** An AI assistant card on the Dashboard that analyzes the user's data and gives a smart morning briefing.

```
Task: Implement AI Daily Briefing & Smart Suggestions

Instructions:
1. Create a Server Action: generateDailyBriefing(userId)
   - Fetch: today's tasks, overdue tasks, upcoming deadlines (next 3 days), habit streak status
   - Construct LLM prompt:
     "You are a productivity coach. Analyze this user's data: [JSON].
      Provide a friendly morning briefing (max 150 words) covering:
      1. Top 3 priorities for today
      2. Warning about overdue items (if any)
      3. Encouragement about habit streaks"
   - Call OpenAI or Anthropic API (key stored in .env as OPENAI_API_KEY or ANTHROPIC_API_KEY)
   - Use streaming response if possible (Vercel AI SDK recommended)
2. Build AIBriefingCard component for Dashboard:
   - "✨ Generate Morning Briefing" button
   - Loading skeleton while generating
   - Render markdown response in a glassmorphism card
   - Cache result per day (don't regenerate on every refresh)
3. Place card prominently at top of Dashboard page
4. Ensure API key is NOT exposed to client side
```

---

## ⚠️ Important Notes for Windsurf

1. **Realtime Sync is already active** — any Supabase update you write should automatically propagate to the existing `useRealtimeTasks` and `useRealtimeProjects` hooks. Do not break these hooks.
2. **Optimistic updates are already implemented** in the Kanban Board — follow the same pattern for Calendar drag-and-drop.
3. **RLS is active** — all Supabase queries must be made with authenticated client. The Supabase client setup already exists in the codebase.
4. **PWA manifest and service worker are configured** — do not modify `next.config.js` PWA settings unless necessary.
5. **UI Theme:** All new components must match the existing Dark Mode / Glassmorphism aesthetic. Use existing Shadcn/UI components and Tailwind classes already in the project.

---

## 🔑 Environment Variables Required

Make sure these are set in `.env.local` and Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=<your supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your supabase anon key>
OPENAI_API_KEY=<needed for Phase 4 AI feature>
# OR
ANTHROPIC_API_KEY=<alternative for Phase 4>
```

---

## 🎯 Start Command for Windsurf

> "Please start with **Phase 1: Interactive Calendar View**. Read the instructions above carefully. The existing codebase already has Supabase Realtime Sync and a Kanban Board — follow the same patterns for the Calendar's drag-and-drop and database update logic. Begin by installing `react-big-calendar` and building the `/calendar` route."

---

*Generated from project session history. Last completed milestone: PWA + Realtime Sync + App Logo.*
