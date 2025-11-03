-- Check Database Schema and Foreign Key Constraints
-- Run this in Supabase SQL Editor to verify the database structure

-- Check if tables exist
SELECT
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('courses', 'study_levels', 'languages', 'teachers', 'profiles', 'course_specialties', 'specialties', 'sections')
ORDER BY table_name;

-- Check foreign key constraints on courses table
SELECT
  tc.table_name,
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

-- Check if study_levels table has data
SELECT COUNT(*) as study_levels_count FROM study_levels;

-- Check if languages table has data
SELECT COUNT(*) as languages_count FROM languages;

-- Check if specialties table has data
SELECT COUNT(*) as specialties_count FROM specialties;

-- Check courses table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'courses'
  AND table_schema = 'public'
ORDER BY ordinal_position;