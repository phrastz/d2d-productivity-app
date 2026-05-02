-- Step 2: Add missing columns for progress calculation logic

-- Tasks table: add progress tracking columns
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Sub-projects table: add weight and progress columns
ALTER TABLE public.sub_projects
  ADD COLUMN IF NOT EXISTS weight_contribution DECIMAL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;

-- Grant permissions
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.sub_projects TO anon, authenticated;

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');
