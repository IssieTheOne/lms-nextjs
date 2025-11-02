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

-- Trigger to automatically create profile for new users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('student', 'teacher', 'parent', 'admin')) DEFAULT 'student',
  avatar_url TEXT,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- teachers table
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  subjects TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- courses table
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  price DECIMAL(10,2),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sections table
CREATE TABLE sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- quizzes table
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- progress table
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT FALSE,
  score DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

-- badges table
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  criteria JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- student_badges table
CREATE TABLE student_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- parent_student_links table
CREATE TABLE parent_student_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Teachers: public read, teachers can update own
CREATE POLICY "Public can view teachers" ON teachers FOR SELECT USING (true);
CREATE POLICY "Teachers can update own" ON teachers FOR UPDATE USING (profile_id = auth.uid());

-- Courses: public read, teachers can manage own courses
CREATE POLICY "Public can view courses" ON courses FOR SELECT USING (true);
CREATE POLICY "Teachers can manage own courses" ON courses FOR ALL USING (teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()));

-- Sections: enrolled students can view, teachers can manage
CREATE POLICY "Enrolled students can view sections" ON sections FOR SELECT USING (
  EXISTS (SELECT 1 FROM progress p JOIN lessons l ON p.lesson_id = l.id WHERE l.section_id = sections.id AND p.student_id = auth.uid())
  OR EXISTS (SELECT 1 FROM courses c WHERE c.id = sections.course_id AND c.teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()))
);
CREATE POLICY "Teachers can manage sections" ON sections FOR ALL USING (
  course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()))
);

-- Similar for lessons, quizzes, progress, etc.
-- For brevity, add basic policies

CREATE POLICY "Enrolled students can view lessons" ON lessons FOR SELECT USING (
  EXISTS (SELECT 1 FROM progress p WHERE p.lesson_id = lessons.id AND p.student_id = auth.uid())
  OR section_id IN (SELECT id FROM sections WHERE course_id IN (SELECT id FROM courses WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())))
);

CREATE POLICY "Students can update own progress" ON progress FOR ALL USING (student_id = auth.uid());

-- Badges: public read
CREATE POLICY "Public can view badges" ON badges FOR SELECT USING (true);

-- Student badges: students can view own
CREATE POLICY "Students can view own badges" ON student_badges FOR SELECT USING (student_id = auth.uid());

-- Parent links: parents can view own links, students can view links to them
CREATE POLICY "Parents can view own links" ON parent_student_links FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Students can view links to them" ON parent_student_links FOR SELECT USING (student_id = auth.uid());