-- Migration 012: Add Routines feature tables
-- Run this directly in Supabase SQL Editor

-- ============================================================
-- 1. routines
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title                   TEXT NOT NULL,
  description             TEXT,
  category                TEXT,
  frequency_type          TEXT CHECK (frequency_type IN ('daily','weekly','monthly','yearly','custom')),
  frequency_interval      INTEGER DEFAULT 1,
  frequency_day_of_week   INTEGER,  -- 0=Sun, 6=Sat
  frequency_day_of_month  INTEGER,  -- 1-31
  status                  TEXT DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  next_due_date           DATE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. routine_occurrences
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_occurrences (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id    UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  owner_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  due_date      DATE NOT NULL,
  completed_at  TIMESTAMPTZ,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending','completed','delayed')),
  delay_reason  TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. routine_checklist_items
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_checklist_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id  UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label       TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. routine_occurrence_checks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_occurrence_checks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id     UUID REFERENCES public.routine_occurrences(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id UUID REFERENCES public.routine_checklist_items(id) ON DELETE CASCADE NOT NULL,
  is_checked        BOOLEAN DEFAULT false,
  checked_at        TIMESTAMPTZ,
  UNIQUE (occurrence_id, checklist_item_id)
);

-- ============================================================
-- 5. routine_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id        UUID REFERENCES public.routines(id) ON DELETE CASCADE NOT NULL,
  occurrence_id     UUID REFERENCES public.routine_occurrences(id) ON DELETE SET NULL,
  owner_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content           TEXT NOT NULL,
  follow_up_status  TEXT DEFAULT 'pending' CHECK (follow_up_status IN ('pending','in_progress','resolved')),
  follow_up_date    TIMESTAMPTZ,
  follow_up_note    TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_routines_owner_id         ON public.routines(owner_id);
CREATE INDEX IF NOT EXISTS idx_routines_status           ON public.routines(status);
CREATE INDEX IF NOT EXISTS idx_routines_next_due_date    ON public.routines(next_due_date);

CREATE INDEX IF NOT EXISTS idx_routine_occ_routine_id   ON public.routine_occurrences(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_occ_owner_id     ON public.routine_occurrences(owner_id);
CREATE INDEX IF NOT EXISTS idx_routine_occ_due_date     ON public.routine_occurrences(due_date);
CREATE INDEX IF NOT EXISTS idx_routine_occ_status       ON public.routine_occurrences(status);

CREATE INDEX IF NOT EXISTS idx_routine_cli_routine_id   ON public.routine_checklist_items(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_occ_chk_occ_id   ON public.routine_occurrence_checks(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_routine_notes_routine_id ON public.routine_notes(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_notes_owner_id   ON public.routine_notes(owner_id);

-- ============================================================
-- 7. RLS
-- ============================================================
ALTER TABLE public.routines                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_occurrences     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_occurrence_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_notes           ENABLE ROW LEVEL SECURITY;

-- routines
DROP POLICY IF EXISTS "Users manage own routines select"  ON public.routines;
DROP POLICY IF EXISTS "Users manage own routines insert"  ON public.routines;
DROP POLICY IF EXISTS "Users manage own routines update"  ON public.routines;
DROP POLICY IF EXISTS "Users manage own routines delete"  ON public.routines;
CREATE POLICY "Users manage own routines select"  ON public.routines FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users manage own routines insert"  ON public.routines FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users manage own routines update"  ON public.routines FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users manage own routines delete"  ON public.routines FOR DELETE USING (auth.uid() = owner_id);

-- routine_occurrences
DROP POLICY IF EXISTS "Users manage own occ select"  ON public.routine_occurrences;
DROP POLICY IF EXISTS "Users manage own occ insert"  ON public.routine_occurrences;
DROP POLICY IF EXISTS "Users manage own occ update"  ON public.routine_occurrences;
DROP POLICY IF EXISTS "Users manage own occ delete"  ON public.routine_occurrences;
CREATE POLICY "Users manage own occ select"  ON public.routine_occurrences FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users manage own occ insert"  ON public.routine_occurrences FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users manage own occ update"  ON public.routine_occurrences FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users manage own occ delete"  ON public.routine_occurrences FOR DELETE USING (auth.uid() = owner_id);

-- routine_checklist_items
DROP POLICY IF EXISTS "Users manage own cli select"  ON public.routine_checklist_items;
DROP POLICY IF EXISTS "Users manage own cli insert"  ON public.routine_checklist_items;
DROP POLICY IF EXISTS "Users manage own cli update"  ON public.routine_checklist_items;
DROP POLICY IF EXISTS "Users manage own cli delete"  ON public.routine_checklist_items;
CREATE POLICY "Users manage own cli select"  ON public.routine_checklist_items FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users manage own cli insert"  ON public.routine_checklist_items FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users manage own cli update"  ON public.routine_checklist_items FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users manage own cli delete"  ON public.routine_checklist_items FOR DELETE USING (auth.uid() = owner_id);

-- routine_occurrence_checks (linked via occurrence owner)
DROP POLICY IF EXISTS "Users manage own occ checks select"  ON public.routine_occurrence_checks;
DROP POLICY IF EXISTS "Users manage own occ checks insert"  ON public.routine_occurrence_checks;
DROP POLICY IF EXISTS "Users manage own occ checks update"  ON public.routine_occurrence_checks;
DROP POLICY IF EXISTS "Users manage own occ checks delete"  ON public.routine_occurrence_checks;
CREATE POLICY "Users manage own occ checks select" ON public.routine_occurrence_checks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.routine_occurrences o WHERE o.id = occurrence_id AND o.owner_id = auth.uid()));
CREATE POLICY "Users manage own occ checks insert" ON public.routine_occurrence_checks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.routine_occurrences o WHERE o.id = occurrence_id AND o.owner_id = auth.uid()));
CREATE POLICY "Users manage own occ checks update" ON public.routine_occurrence_checks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.routine_occurrences o WHERE o.id = occurrence_id AND o.owner_id = auth.uid()));
CREATE POLICY "Users manage own occ checks delete" ON public.routine_occurrence_checks FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.routine_occurrences o WHERE o.id = occurrence_id AND o.owner_id = auth.uid()));

-- routine_notes
DROP POLICY IF EXISTS "Users manage own routine notes select"  ON public.routine_notes;
DROP POLICY IF EXISTS "Users manage own routine notes insert"  ON public.routine_notes;
DROP POLICY IF EXISTS "Users manage own routine notes update"  ON public.routine_notes;
DROP POLICY IF EXISTS "Users manage own routine notes delete"  ON public.routine_notes;
CREATE POLICY "Users manage own routine notes select"  ON public.routine_notes FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users manage own routine notes insert"  ON public.routine_notes FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users manage own routine notes update"  ON public.routine_notes FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users manage own routine notes delete"  ON public.routine_notes FOR DELETE USING (auth.uid() = owner_id);

-- ============================================================
-- 8. Reload PostgREST schema cache
-- ============================================================
SELECT pg_notify('pgrst', 'reload schema');
