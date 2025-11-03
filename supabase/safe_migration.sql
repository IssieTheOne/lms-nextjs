-- Safe Migration Script for Existing LMS Database
-- Run this in Supabase SQL Editor to add missing columns and fix schema issues
-- This script is designed to be safe to run multiple times

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SAFE COLUMN ADDITIONS (only add if table and column don't exist)
-- ============================================================================

-- Profiles table additions
DO $$
BEGIN
  RAISE NOTICE 'Checking profiles table...';

  -- Add is_active column if missing
  IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'profiles' AND t.table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
      ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
      RAISE NOTICE '✓ Added is_active column to profiles';
    ELSE
      RAISE NOTICE '✓ is_active column already exists in profiles';
    END IF;

    -- Add is_archived column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_archived') THEN
      ALTER TABLE profiles ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
      RAISE NOTICE '✓ Added is_archived column to profiles';
    ELSE
      RAISE NOTICE '✓ is_archived column already exists in profiles';
    END IF;

    -- Add updated_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
      ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      RAISE NOTICE '✓ Added updated_at column to profiles';
    ELSE
      RAISE NOTICE '✓ updated_at column already exists in profiles';
    END IF;
  ELSE
    RAISE NOTICE '⚠ profiles table does not exist, skipping column additions';
  END IF;
END $$;

-- Courses table additions
DO $$
BEGIN
  RAISE NOTICE 'Checking courses table...';

  IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'courses' AND t.table_schema = 'public') THEN
    -- Rename title to name if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'title') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'name') THEN
      ALTER TABLE courses RENAME COLUMN title TO name;
      RAISE NOTICE '✓ Renamed title column to name in courses';
    END IF;

    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'is_published') THEN
      ALTER TABLE courses ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
      RAISE NOTICE '✓ Added is_published column to courses';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'study_level_id') THEN
      -- Check if study_levels table exists, if not try academic_years
      IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'study_levels' AND t.table_schema = 'public') THEN
        ALTER TABLE courses ADD COLUMN study_level_id UUID REFERENCES study_levels(id) ON DELETE SET NULL;
        RAISE NOTICE '✓ Added study_level_id column to courses';
      ELSIF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'academic_years' AND t.table_schema = 'public') THEN
        ALTER TABLE courses ADD COLUMN study_level_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;
        RAISE NOTICE '✓ Added study_level_id column to courses (referencing academic_years)';
      END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'language_id') THEN
      ALTER TABLE courses ADD COLUMN language_id UUID REFERENCES languages(id) ON DELETE SET NULL;
      RAISE NOTICE '✓ Added language_id column to courses';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'xp_value') THEN
      ALTER TABLE courses ADD COLUMN xp_value INTEGER DEFAULT 100;
      RAISE NOTICE '✓ Added xp_value column to courses';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'created_at') THEN
      ALTER TABLE courses ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      RAISE NOTICE '✓ Added created_at column to courses';
    END IF;
  ELSE
    RAISE NOTICE '⚠ courses table does not exist, skipping column additions';
  END IF;
END $$;

-- Quizzes table additions
DO $$
BEGIN
  RAISE NOTICE 'Checking quizzes table...';

  IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'quizzes' AND t.table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'section_id') THEN
      ALTER TABLE quizzes ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE CASCADE;
      RAISE NOTICE '✓ Added section_id column to quizzes';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'title') THEN
      ALTER TABLE quizzes ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Quiz';
      RAISE NOTICE '✓ Added title column to quizzes';
    END IF;

    -- Rename questions to data if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'questions') AND
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'data') THEN
      ALTER TABLE quizzes RENAME COLUMN questions TO data;
      RAISE NOTICE '✓ Renamed questions column to data in quizzes';
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quizzes' AND column_name = 'data') THEN
      ALTER TABLE quizzes ADD COLUMN data JSONB;
      RAISE NOTICE '✓ Added data column to quizzes';
    END IF;
  ELSE
    RAISE NOTICE '⚠ quizzes table does not exist, skipping column additions';
  END IF;
END $$;

-- Other table additions
DO $$
BEGIN
  -- Sections table
  IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'sections' AND t.table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sections' AND column_name = 'order_index') THEN
      ALTER TABLE sections ADD COLUMN order_index INTEGER DEFAULT 0;
      RAISE NOTICE '✓ Added order_index column to sections';
    END IF;
  END IF;

  -- Lessons table
  IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'lessons' AND t.table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'order_index') THEN
      ALTER TABLE lessons ADD COLUMN order_index INTEGER DEFAULT 0;
      RAISE NOTICE '✓ Added order_index column to lessons';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'video_url') THEN
      ALTER TABLE lessons ADD COLUMN video_url TEXT;
      RAISE NOTICE '✓ Added video_url column to lessons';
    END IF;
  END IF;

  -- Progress table
  IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'progress' AND t.table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'progress' AND column_name = 'updated_at') THEN
      ALTER TABLE progress ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      RAISE NOTICE '✓ Added updated_at column to progress';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- CREATE MISSING TABLES
-- ============================================================================

-- Create study_levels table if it doesn't exist (and academic_years exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'study_levels' AND t.table_schema = 'public') AND
     EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'academic_years' AND t.table_schema = 'public') THEN
    RAISE NOTICE 'Creating study_levels table...';

    -- Create study_levels table
    CREATE TABLE study_levels (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Copy data from academic_years to study_levels
    INSERT INTO study_levels (id, name, description, created_at)
    SELECT id, name, description, created_at FROM academic_years;

    RAISE NOTICE '✓ Created study_levels table and migrated data from academic_years';
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = 'study_levels' AND t.table_schema = 'public') THEN
    CREATE TABLE study_levels (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE '✓ Created study_levels table';
  END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Creating indexes...';

  -- Profiles indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_active ON profiles(is_active);
    RAISE NOTICE '✓ Created index on profiles.is_active';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_archived') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_archived ON profiles(is_archived);
    RAISE NOTICE '✓ Created index on profiles.is_archived';
  END IF;

  -- Courses indexes
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'study_level_id') THEN
    CREATE INDEX IF NOT EXISTS idx_courses_study_level ON courses(study_level_id);
    RAISE NOTICE '✓ Created index on courses.study_level_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'language_id') THEN
    CREATE INDEX IF NOT EXISTS idx_courses_language ON courses(language_id);
    RAISE NOTICE '✓ Created index on courses.language_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'teacher_id') THEN
    CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
    RAISE NOTICE '✓ Created index on courses.teacher_id';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'is_published') THEN
    CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
    RAISE NOTICE '✓ Created index on courses.is_published';
  END IF;

  RAISE NOTICE '✓ Index creation completed';
END $$;

-- ============================================================================
-- ENABLE RLS (only if not already enabled)
-- ============================================================================

DO $$
DECLARE
  tbl_name TEXT;
BEGIN
  RAISE NOTICE 'Enabling RLS on tables...';

  FOREACH tbl_name IN ARRAY ARRAY['profiles', 'grades', 'study_levels', 'languages', 'specialties', 'teachers', 'courses', 'course_specialties', 'sections', 'lessons', 'quizzes', 'enrollments', 'progress', 'badges', 'student_badges', 'parent_student_links']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = tbl_name AND t.table_schema = 'public') THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl_name);
      RAISE NOTICE '✓ Enabled RLS on %', tbl_name;
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'You can now test course creation and other LMS features.';
END $$;