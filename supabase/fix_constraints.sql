-- Fix Foreign Key Constraints for Courses Table
-- Run this in Supabase SQL Editor if the check_schema.sql shows missing constraints

-- Drop existing constraints if they exist (to avoid conflicts)
DO $$
BEGIN
  -- Drop existing foreign key constraints if they exist
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_courses_study_level' AND table_name = 'courses') THEN
    ALTER TABLE courses DROP CONSTRAINT fk_courses_study_level;
    RAISE NOTICE 'Dropped existing fk_courses_study_level constraint';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_courses_language' AND table_name = 'courses') THEN
    ALTER TABLE courses DROP CONSTRAINT fk_courses_language;
    RAISE NOTICE 'Dropped existing fk_courses_language constraint';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_courses_teacher' AND table_name = 'courses') THEN
    ALTER TABLE courses DROP CONSTRAINT fk_courses_teacher;
    RAISE NOTICE 'Dropped existing fk_courses_teacher constraint';
  END IF;
END $$;

-- Add foreign key constraints
DO $$
BEGIN
  -- Add study_level_id foreign key if column exists and study_levels table exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'study_level_id') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'study_levels' AND table_schema = 'public') THEN
    ALTER TABLE courses ADD CONSTRAINT fk_courses_study_level FOREIGN KEY (study_level_id) REFERENCES study_levels(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added fk_courses_study_level constraint';
  END IF;

  -- Add language_id foreign key if column exists and languages table exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'language_id') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'languages' AND table_schema = 'public') THEN
    ALTER TABLE courses ADD CONSTRAINT fk_courses_language FOREIGN KEY (language_id) REFERENCES languages(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added fk_courses_language constraint';
  END IF;

  -- Add teacher_id foreign key if column exists and teachers table exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'teacher_id') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teachers' AND table_schema = 'public') THEN
    ALTER TABLE courses ADD CONSTRAINT fk_courses_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;
    RAISE NOTICE 'Added fk_courses_teacher constraint';
  END IF;

  RAISE NOTICE 'Foreign key constraints setup completed';
END $$;

-- Verify the constraints were added
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'courses';