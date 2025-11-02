-- LMS SaaS Database Schema
-- This schema can be run multiple times safely due to IF NOT EXISTS and DROP IF EXISTS clauses
-- IMPROVED: Added comprehensive column addition scripts for existing databases
-- IMPROVED: Better error handling with DO blocks for safe column additions
-- Run this in your Supabase SQL editor or via psql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment student XP
CREATE OR REPLACE FUNCTION increment_student_xp(student_id UUID, xp_amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET xp_points = xp_points + xp_amount
  WHERE id = student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('student', 'teacher', 'parent', 'admin')) DEFAULT 'student',
  avatar_url TEXT,
  theme TEXT DEFAULT 'light',
  xp_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- languages table
CREATE TABLE IF NOT EXISTS languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- specialties table
CREATE TABLE IF NOT EXISTS specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  language_id UUID REFERENCES languages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  subjects TEXT[],
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- courses table
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  academic_year_id UUID REFERENCES academic_years(id),
  language_id UUID REFERENCES languages(id),
  xp_value INTEGER DEFAULT 100,
  teacher_id UUID REFERENCES teachers(id),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- course_specialties table (many-to-many)
CREATE TABLE IF NOT EXISTS course_specialties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES specialties(id) ON DELETE CASCADE,
  UNIQUE(course_id, specialty_id)
);

-- sections table
CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- progress table
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  score DECIMAL(5,2),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

-- badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  xp_reward INTEGER DEFAULT 50,
  criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- student_badges table
CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, badge_id)
);

-- parent_student_links table
CREATE TABLE IF NOT EXISTS parent_student_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- ============================================================================
-- FIX FOR EXISTING DATABASE: Add missing columns
-- ============================================================================

-- Add is_published column to courses table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'courses' AND column_name = 'is_published') THEN
    ALTER TABLE courses ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add missing columns to quizzes table if they don't exist
DO $$
BEGIN
  -- Add section_id column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'quizzes' AND column_name = 'section_id') THEN
    ALTER TABLE quizzes ADD COLUMN section_id UUID REFERENCES sections(id) ON DELETE CASCADE;
  END IF;

  -- Add title column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'quizzes' AND column_name = 'title') THEN
    ALTER TABLE quizzes ADD COLUMN title TEXT NOT NULL DEFAULT 'Untitled Quiz';
  END IF;

  -- Add data column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'quizzes' AND column_name = 'data') THEN
    ALTER TABLE quizzes ADD COLUMN data JSONB;
  END IF;

  -- Add created_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'quizzes' AND column_name = 'created_at') THEN
    ALTER TABLE quizzes ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add missing columns to other tables if needed
DO $$
BEGIN
  -- Add order_index to sections if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'sections' AND column_name = 'order_index') THEN
    ALTER TABLE sections ADD COLUMN order_index INTEGER DEFAULT 0;
  END IF;

  -- Add order_index to lessons if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'lessons' AND column_name = 'order_index') THEN
    ALTER TABLE lessons ADD COLUMN order_index INTEGER DEFAULT 0;
  END IF;

  -- Add video_url to lessons if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'lessons' AND column_name = 'video_url') THEN
    ALTER TABLE lessons ADD COLUMN video_url TEXT;
  END IF;

  -- Add updated_at columns if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'courses' AND column_name = 'updated_at') THEN
    ALTER TABLE courses ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'progress' AND column_name = 'updated_at') THEN
    ALTER TABLE progress ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- IMPROVED: Added error handling for policy creation
DO $$
BEGIN
  -- Profiles: users can read/update their own
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

  CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
  CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
  CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.is_admin(auth.uid()));
  CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (public.is_admin(auth.uid()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating profiles policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Academic years: public read, admin can manage
  DROP POLICY IF EXISTS "Public can view academic years" ON academic_years;
  DROP POLICY IF EXISTS "Admins can manage academic years" ON academic_years;

  CREATE POLICY "Public can view academic years" ON academic_years FOR SELECT USING (true);
  CREATE POLICY "Admins can manage academic years" ON academic_years FOR ALL USING (public.is_admin(auth.uid()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating academic_years policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Languages: public read, admin can manage
  DROP POLICY IF EXISTS "Public can view languages" ON languages;
  DROP POLICY IF EXISTS "Admins can manage languages" ON languages;

  CREATE POLICY "Public can view languages" ON languages FOR SELECT USING (true);
  CREATE POLICY "Admins can manage languages" ON languages FOR ALL USING (public.is_admin(auth.uid()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating languages policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Specialties: public read, admin can manage
  DROP POLICY IF EXISTS "Public can view specialties" ON specialties;
  DROP POLICY IF EXISTS "Admins can manage specialties" ON specialties;

  CREATE POLICY "Public can view specialties" ON specialties FOR SELECT USING (true);
  CREATE POLICY "Admins can manage specialties" ON specialties FOR ALL USING (public.is_admin(auth.uid()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating specialties policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Teachers: public read, teachers can update own
  DROP POLICY IF EXISTS "Public can view teachers" ON teachers;
  DROP POLICY IF EXISTS "Teachers can update own" ON teachers;
  DROP POLICY IF EXISTS "Admins can manage teachers" ON teachers;

  CREATE POLICY "Public can view teachers" ON teachers FOR SELECT USING (true);
  CREATE POLICY "Teachers can update own" ON teachers FOR UPDATE USING (profile_id = auth.uid());
  CREATE POLICY "Admins can manage teachers" ON teachers FOR ALL USING (public.is_admin(auth.uid()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating teachers policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Courses: public read published courses, teachers can manage own courses
  DROP POLICY IF EXISTS "Public can view published courses" ON courses;
  DROP POLICY IF EXISTS "Teachers can manage own courses" ON courses;
  DROP POLICY IF EXISTS "Admins can manage all courses" ON courses;

  CREATE POLICY "Public can view published courses" ON courses FOR SELECT USING (is_published = true);
  CREATE POLICY "Teachers can manage own courses" ON courses FOR ALL USING (teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()));
  CREATE POLICY "Admins can manage all courses" ON courses FOR ALL USING (public.is_admin(auth.uid()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating courses policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Course specialties: public read, teachers can manage own courses
  DROP POLICY IF EXISTS "Public can view course specialties" ON course_specialties;
  DROP POLICY IF EXISTS "Teachers can manage own course specialties" ON course_specialties;

  CREATE POLICY "Public can view course specialties" ON course_specialties FOR SELECT USING (true);
  CREATE POLICY "Teachers can manage own course specialties" ON course_specialties FOR ALL USING (
    course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating course_specialties policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Sections: enrolled students can view, teachers can manage
  DROP POLICY IF EXISTS "Enrolled students can view sections" ON sections;
  DROP POLICY IF EXISTS "Teachers can manage sections" ON sections;

  CREATE POLICY "Enrolled students can view sections" ON sections FOR SELECT USING (
    EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = sections.course_id AND e.student_id = auth.uid())
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = sections.course_id AND c.teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()))
  );
  CREATE POLICY "Teachers can manage sections" ON sections FOR ALL USING (
    course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating sections policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Lessons: enrolled students can view, teachers can manage
  DROP POLICY IF EXISTS "Enrolled students can view lessons" ON lessons;
  DROP POLICY IF EXISTS "Teachers can manage lessons" ON lessons;

  CREATE POLICY "Enrolled students can view lessons" ON lessons FOR SELECT USING (
    EXISTS (SELECT 1 FROM enrollments e JOIN sections s ON e.course_id = s.course_id WHERE s.id = lessons.section_id AND e.student_id = auth.uid())
    OR section_id IN (SELECT id FROM sections WHERE course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())))
  );
  CREATE POLICY "Teachers can manage lessons" ON lessons FOR ALL USING (
    section_id IN (SELECT id FROM sections WHERE course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating lessons policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Quizzes: enrolled students can view, teachers can manage
  DROP POLICY IF EXISTS "Enrolled students can view quizzes" ON quizzes;
  DROP POLICY IF EXISTS "Teachers can manage quizzes" ON quizzes;

  CREATE POLICY "Enrolled students can view quizzes" ON quizzes FOR SELECT USING (
    EXISTS (SELECT 1 FROM enrollments e JOIN sections s ON e.course_id = s.course_id WHERE s.id = quizzes.section_id AND e.student_id = auth.uid())
    OR section_id IN (SELECT id FROM sections WHERE course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())))
  );
  CREATE POLICY "Teachers can manage quizzes" ON quizzes FOR ALL USING (
    section_id IN (SELECT id FROM sections WHERE course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating quizzes policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Enrollments: students can view own, teachers can view course enrollments
  DROP POLICY IF EXISTS "Students can view own enrollments" ON enrollments;
  DROP POLICY IF EXISTS "Teachers can view course enrollments" ON enrollments;

  CREATE POLICY "Students can view own enrollments" ON enrollments FOR SELECT USING (student_id = auth.uid());
  CREATE POLICY "Teachers can view course enrollments" ON enrollments FOR SELECT USING (
    course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating enrollments policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Progress: students can manage own progress
  DROP POLICY IF EXISTS "Students can manage own progress" ON progress;
  DROP POLICY IF EXISTS "Teachers can view course progress" ON progress;

  CREATE POLICY "Students can manage own progress" ON progress FOR ALL USING (student_id = auth.uid());
  CREATE POLICY "Teachers can view course progress" ON progress FOR SELECT USING (
    lesson_id IN (SELECT id FROM lessons WHERE section_id IN (SELECT id FROM sections WHERE course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()))))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating progress policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Badges: public read, admin can manage
  DROP POLICY IF EXISTS "Public can view badges" ON badges;
  DROP POLICY IF EXISTS "Admins can manage badges" ON badges;

  CREATE POLICY "Public can view badges" ON badges FOR SELECT USING (true);
  CREATE POLICY "Admins can manage badges" ON badges FOR ALL USING (public.is_admin(auth.uid()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating badges policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Student badges: students can view own
  DROP POLICY IF EXISTS "Students can view own badges" ON student_badges;
  DROP POLICY IF EXISTS "Admins can manage student badges" ON student_badges;

  CREATE POLICY "Students can view own badges" ON student_badges FOR SELECT USING (student_id = auth.uid());
  CREATE POLICY "Admins can manage student badges" ON student_badges FOR ALL USING (public.is_admin(auth.uid()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating student_badges policies: %', SQLERRM;
END $$;

DO $$
BEGIN
  -- Parent links: parents can view own links, students can view links to them
  DROP POLICY IF EXISTS "Parents can view own links" ON parent_student_links;
  DROP POLICY IF EXISTS "Students can view links to them" ON parent_student_links;
  DROP POLICY IF EXISTS "Admins can manage parent links" ON parent_student_links;

  CREATE POLICY "Parents can view own links" ON parent_student_links FOR SELECT USING (parent_id = auth.uid());
  CREATE POLICY "Students can view links to them" ON parent_student_links FOR SELECT USING (student_id = auth.uid());
  CREATE POLICY "Admins can manage parent links" ON parent_student_links FOR ALL USING (public.is_admin(auth.uid()));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating parent_student_links policies: %', SQLERRM;
END $$;

-- ============================================================================
-- OPTIONAL: Sample Data (Uncomment to insert initial data)
-- ============================================================================

-- Insert sample academic years
-- INSERT INTO academic_years (name, description) VALUES
-- ('2024-2025', 'Current academic year'),
-- ('2025-2026', 'Next academic year')
-- ON CONFLICT DO NOTHING;

-- Insert sample languages
-- INSERT INTO languages (name, code) VALUES
-- ('English', 'en'),
-- ('French', 'fr'),
-- ('Arabic', 'ar')
-- ON CONFLICT DO NOTHING;

-- Insert sample specialties
-- INSERT INTO specialties (name, language_id) VALUES
-- ('Mathematics', (SELECT id FROM languages WHERE code = 'en')),
-- ('Physics', (SELECT id FROM languages WHERE code = 'en')),
-- ('Literature', (SELECT id FROM languages WHERE code = 'fr'))
-- ON CONFLICT DO NOTHING;

-- Insert sample badges
-- INSERT INTO badges (name, description, xp_reward, criteria) VALUES
-- ('First Steps', 'Complete your first lesson', 50, '{"lessons_completed": 1}'),
-- ('Dedicated Learner', 'Complete 10 lessons', 100, '{"lessons_completed": 10}'),
-- ('Course Master', 'Complete an entire course', 500, '{"courses_completed": 1}')
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- DEPLOYMENT NOTES
-- ============================================================================
-- 1. Run this schema in Supabase SQL Editor or via psql
-- 2. The schema is idempotent - can be run multiple times safely
-- 3. After running, verify RLS policies are working correctly
-- 4. Test user registration to ensure profiles are created automatically
-- 5. Set up your environment variables in .env.local:
--    - NEXT_PUBLIC_SUPABASE_URL
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY
--    - SUPABASE_SERVICE_ROLE_KEY
--    - DEEPSEEK_API_KEY (for AI chat)
--    - CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCESS_KEY_ID, etc. (for file uploads)
--    - MAILERSEND_API_KEY (for email notifications)