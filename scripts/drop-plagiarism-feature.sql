-- Drop plagiarism-related database objects
-- Safe to run multiple times due to IF EXISTS guards

-- 1) Drop views (if any depended on these tables)
DROP VIEW IF EXISTS public.plagiarism_reports_view CASCADE;

-- 2) Drop functions and helpers used by plagiarism feature
DROP FUNCTION IF EXISTS public.track_plagiarism_usage(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_plagiarism_checks(interval) CASCADE;

-- 3) Drop tables (CASCADE to remove dependent constraints/indices)
DROP TABLE IF EXISTS public.plagiarism_reports CASCADE;
DROP TABLE IF EXISTS public.plagiarism_usage CASCADE;
DROP TABLE IF EXISTS public.external_sources CASCADE;
DROP TABLE IF EXISTS public.plagiarism_checks CASCADE;

-- 4) Drop RLS policies explicitly if they weren't removed by CASCADE
DO $$
BEGIN
  -- plagiarism_checks policies
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plagiarism_checks'
  ) THEN
    EXECUTE 'ALTER TABLE public.plagiarism_checks DISABLE ROW LEVEL SECURITY';
  END IF;

  -- external_sources policies
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'external_sources'
  ) THEN
    EXECUTE 'ALTER TABLE public.external_sources DISABLE ROW LEVEL SECURITY';
  END IF;

  -- plagiarism_reports policies
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plagiarism_reports'
  ) THEN
    EXECUTE 'ALTER TABLE public.plagiarism_reports DISABLE ROW LEVEL SECURITY';
  END IF;

  -- plagiarism_usage policies
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'plagiarism_usage'
  ) THEN
    EXECUTE 'ALTER TABLE public.plagiarism_usage DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- 5) Verification helpers
-- SELECT to confirm nothing remains (no-op if tables dropped)
-- SELECT to_regclass('public.plagiarism_checks');
-- SELECT to_regclass('public.external_sources');
-- SELECT to_regclass('public.plagiarism_reports');
-- SELECT to_regclass('public.plagiarism_usage');
