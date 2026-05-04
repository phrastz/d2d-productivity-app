-- ============================================================================
-- MIGRATION 007: Sub-Project Dependencies
-- ============================================================================
-- This migration adds dependency tracking between sub-projects
-- Run this in Supabase SQL Editor to complete the schema
-- ============================================================================

-- ============================================================================
-- PART 1: Add Dependency Column to Sub-Projects
-- ============================================================================

-- Add dependency tracking (which sub-project this one depends on)
ALTER TABLE public.sub_projects 
ADD COLUMN IF NOT EXISTS depends_on_subproject_id UUID REFERENCES public.sub_projects(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_subprojects_dependency 
ON public.sub_projects(depends_on_subproject_id) 
WHERE depends_on_subproject_id IS NOT NULL;

-- Add constraint: sub-project cannot depend on itself
ALTER TABLE public.sub_projects 
DROP CONSTRAINT IF EXISTS no_self_dependency;

ALTER TABLE public.sub_projects 
ADD CONSTRAINT no_self_dependency 
CHECK (id != depends_on_subproject_id);

-- ============================================================================
-- PART 2: Create Dependency View for Analysis
-- ============================================================================

CREATE OR REPLACE VIEW sub_project_dependencies AS
SELECT 
    sp.id,
    sp.name,
    sp.project_id,
    sp.status,
    sp.priority,
    sp.start_date,
    sp.end_date,
    sp.depends_on_subproject_id,
    dep.name as depends_on_name,
    dep.status as depends_on_status,
    dep.end_date as depends_on_end_date,
    CASE 
        WHEN dep.status = 'completed' THEN true
        WHEN dep.id IS NULL THEN true
        ELSE false
    END as can_start
FROM public.sub_projects sp
LEFT JOIN public.sub_projects dep ON sp.depends_on_subproject_id = dep.id;

-- Grant permissions
GRANT SELECT ON sub_project_dependencies TO anon, authenticated;

-- ============================================================================
-- PART 3: Create Function to Check Dependency Chain
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_dependency_chain(sub_project_uuid UUID)
RETURNS TABLE (
    dependency_id UUID,
    dependency_name TEXT,
    dependency_status TEXT,
    is_blocking BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE dependency_chain AS (
        -- Base case: immediate dependency
        SELECT 
            sp.depends_on_subproject_id as id,
            dep.name,
            dep.status,
            dep.status != 'completed' as is_blocking
        FROM public.sub_projects sp
        JOIN public.sub_projects dep ON sp.depends_on_subproject_id = dep.id
        WHERE sp.id = sub_project_uuid
        
        UNION ALL
        
        -- Recursive: dependencies of dependencies
        SELECT 
            sp.depends_on_subproject_id,
            dep.name,
            dep.status,
            dep.status != 'completed'
        FROM public.sub_projects sp
        JOIN public.sub_projects dep ON sp.depends_on_subproject_id = dep.id
        JOIN dependency_chain dc ON sp.id = dc.id
        WHERE sp.depends_on_subproject_id IS NOT NULL
    )
    SELECT dc.id, dc.name, dc.status, dc.is_blocking
    FROM dependency_chain dc;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_dependency_chain TO anon, authenticated;

-- ============================================================================
-- PART 4: Create Trigger to Prevent Status Change if Dependency Not Met
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_subproject_dependency()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check when changing TO in_progress
    IF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
        -- Check if there's a blocking dependency
        IF NEW.depends_on_subproject_id IS NOT NULL THEN
            DECLARE
                dep_status TEXT;
            BEGIN
                SELECT status INTO dep_status
                FROM public.sub_projects
                WHERE id = NEW.depends_on_subproject_id;
                
                IF dep_status IS NULL OR dep_status != 'completed' THEN
                    RAISE EXCEPTION 'Cannot start sub-project: dependency not completed (status: %)', dep_status;
                END IF;
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_dependency_before_start ON public.sub_projects;
CREATE TRIGGER check_dependency_before_start
BEFORE UPDATE ON public.sub_projects
FOR EACH ROW
EXECUTE FUNCTION public.validate_subproject_dependency();

-- ============================================================================
-- PART 5: Grant Permissions
-- ============================================================================

GRANT ALL ON public.sub_projects TO anon, authenticated;

-- ============================================================================
-- PART 6: Reload Schema Cache
-- ============================================================================

SELECT pg_notify('pgrst', 'reload schema');

-- ============================================================================
-- PART 7: Verification
-- ============================================================================

SELECT 
    'Migration 007 Complete!' as status,
    COUNT(*) FILTER (WHERE column_name = 'depends_on_subproject_id') as dependency_column_exists
FROM information_schema.columns 
WHERE table_name = 'sub_projects' 
AND column_name = 'depends_on_subproject_id';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
