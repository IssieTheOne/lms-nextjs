-- Clean up duplicate foreign key constraints that are causing Supabase embedding errors
-- Run this in Supabase SQL Editor to remove conflicting constraints

DO $$
BEGIN
  RAISE NOTICE 'Cleaning up duplicate foreign key constraints...';

  -- Drop duplicate language constraint (keep fk_courses_language)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'courses_language_id_fkey'
    AND table_name = 'courses'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE courses DROP CONSTRAINT courses_language_id_fkey;
    RAISE NOTICE '✓ Dropped duplicate constraint courses_language_id_fkey';
  END IF;

  -- Drop incorrect study_level constraint (points to academic_years instead of study_levels)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'courses_study_level_id_fkey'
    AND table_name = 'courses'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE courses DROP CONSTRAINT courses_study_level_id_fkey;
    RAISE NOTICE '✓ Dropped incorrect constraint courses_study_level_id_fkey (pointed to academic_years)';
  END IF;

  -- Drop duplicate teacher constraint (keep fk_courses_teacher)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'courses_teacher_id_fkey'
    AND table_name = 'courses'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE courses DROP CONSTRAINT courses_teacher_id_fkey;
    RAISE NOTICE '✓ Dropped duplicate constraint courses_teacher_id_fkey';
  END IF;

  RAISE NOTICE 'Constraint cleanup completed successfully!';
  RAISE NOTICE 'Now only the correct constraints remain:';
  RAISE NOTICE '  - fk_courses_language -> languages(id)';
  RAISE NOTICE '  - fk_courses_study_level -> study_levels(id)';
  RAISE NOTICE '  - fk_courses_teacher -> teachers(id)';
END $$;