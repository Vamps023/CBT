-- WARNING: This script DROPS and recreates your app schema in public.
-- It will DELETE all data in these tables.

-- Extensions (safe if already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level') THEN
    CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lesson_type') THEN
    CREATE TYPE lesson_type AS ENUM ('video', 'assessment', 'simulation');
  END IF;
END $$;

-- Drop tables (app tables only) in dependency order
DROP TABLE IF EXISTS assessment_answers CASCADE;
DROP TABLE IF EXISTS assessment_options CASCADE;
DROP TABLE IF EXISTS assessment_questions CASCADE;
DROP TABLE IF EXISTS assessment_attempts CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS completed_lessons CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS course_modules CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users (profile table mapped to auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'student',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_hours INTEGER NOT NULL DEFAULT 0,
  difficulty_level difficulty_level NOT NULL DEFAULT 'beginner',
  instructor_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Course modules
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id, "order")
);

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  "order" INTEGER NOT NULL,
  type lesson_type NOT NULL DEFAULT 'video',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, "order")
);

-- Assessments
CREATE TABLE IF NOT EXISTS assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  passing_score INTEGER NOT NULL DEFAULT 80,
  time_limit_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lesson_id)
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, order_index)
);

CREATE TABLE IF NOT EXISTS assessment_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER,
  passed BOOLEAN,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  UNIQUE(assessment_id, user_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES assessment_options(id) ON DELETE SET NULL,
  is_correct BOOLEAN
);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  progress_percentage INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  last_accessed_lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  UNIQUE(user_id, course_id)
);

-- Completed lessons
CREATE TABLE IF NOT EXISTS completed_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(enrollment_id, lesson_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_options_question ON assessment_options(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_attempt ON assessment_answers(attempt_id);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_lessons ENABLE ROW LEVEL SECURITY;

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE OR REPLACE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_courses_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_course_modules_updated_at
BEFORE UPDATE ON course_modules
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create public.handle_new_user() to mirror auth.users into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Role lookup without recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- USERS policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Admin can read users (no recursion)
CREATE POLICY "Admin read users"
  ON users FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin');

-- COURSES policies
CREATE POLICY "Courses read for all"
  ON courses FOR SELECT
  USING (true);

CREATE POLICY "Courses insert for authenticated"
  ON courses FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Courses update by instructor"
  ON courses FOR UPDATE
  USING (auth.uid() = instructor_id)
  WITH CHECK (auth.uid() = instructor_id);

-- Helper read condition: published or enrolled
-- Use within policies via EXISTS subqueries
-- COURSE_MODULES policies
CREATE POLICY "Read modules: published/enrolled or admin/instructor"
  ON course_modules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = course_modules.course_id
        AND (
          c.is_published = TRUE OR
          EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
        )
    )
    OR public.get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.instructor_id = auth.uid())
  );

CREATE POLICY "Write modules by admin or course instructor"
  ON course_modules FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.instructor_id = auth.uid())
  );

CREATE POLICY "Update modules by admin or course instructor"
  ON course_modules FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.instructor_id = auth.uid())
  )
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.instructor_id = auth.uid())
  );

CREATE POLICY "Delete modules by admin or course instructor"
  ON course_modules FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = course_modules.course_id AND c.instructor_id = auth.uid())
  );

-- LESSONS policies
CREATE POLICY "Read lessons: published/enrolled or admin/instructor"
  ON lessons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id
        AND (
          c.is_published = TRUE OR
          EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
        )
    )
    OR public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Write lessons by admin or instructor"
  ON lessons FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Update lessons by admin or instructor"
  ON lessons FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Delete lessons by admin or instructor"
  ON lessons FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM course_modules m
      JOIN courses c ON c.id = m.course_id
      WHERE m.id = lessons.module_id AND c.instructor_id = auth.uid()
    )
  );

-- ASSESSMENTS policies
CREATE POLICY "Read assessments: published/enrolled or admin/instructor"
  ON assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = assessments.lesson_id
        AND (
          c.is_published = TRUE OR
          EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
        )
    )
    OR public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM lessons l
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = assessments.lesson_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admin write assessments"
  ON assessments FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Instructor write assessments"
  ON assessments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = assessments.lesson_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE l.id = assessments.lesson_id AND c.instructor_id = auth.uid()
    )
  );

-- QUESTIONS/OPTIONS policies
CREATE POLICY "Read questions by admin or instructor"
  ON assessment_questions FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'admin' OR EXISTS (
      SELECT 1 FROM assessments a
      JOIN lessons l ON l.id = a.lesson_id
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE a.id = assessment_questions.assessment_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admin write questions"
  ON assessment_questions FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Instructor write questions"
  ON assessment_questions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN lessons l ON l.id = a.lesson_id
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE a.id = assessment_questions.assessment_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN lessons l ON l.id = a.lesson_id
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE a.id = assessment_questions.assessment_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Read options by admin or instructor"
  ON assessment_options FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'admin' OR EXISTS (
      SELECT 1 FROM assessment_questions q
      JOIN assessments a ON a.id = q.assessment_id
      JOIN lessons l ON l.id = a.lesson_id
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE q.id = assessment_options.question_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admin write options"
  ON assessment_options FOR ALL TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Instructor write options"
  ON assessment_options FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_questions q
      JOIN assessments a ON a.id = q.assessment_id
      JOIN lessons l ON l.id = a.lesson_id
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE q.id = assessment_options.question_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_questions q
      JOIN assessments a ON a.id = q.assessment_id
      JOIN lessons l ON l.id = a.lesson_id
      JOIN course_modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      WHERE q.id = assessment_options.question_id AND c.instructor_id = auth.uid()
    )
  );

-- Attempts & Answers policies (students manage their own)
CREATE POLICY "Student attempts CRUD (own)"
  ON assessment_attempts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Student answers CRUD (via own attempts)"
  ON assessment_answers FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts aa WHERE aa.id = assessment_answers.attempt_id AND aa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessment_attempts aa WHERE aa.id = assessment_answers.attempt_id AND aa.user_id = auth.uid()
    )
  );

-- ENROLLMENTS policies
CREATE POLICY "Users can view their own enrollments"
  ON enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own enrollments"
  ON enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Read enrollments by admin or course instructor"
  ON enrollments FOR SELECT TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = enrollments.course_id AND c.instructor_id = auth.uid())
  );

CREATE POLICY "Write enrollments by admin or course instructor"
  ON enrollments FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = enrollments.course_id AND c.instructor_id = auth.uid())
  );

CREATE POLICY "Delete enrollments by admin or course instructor"
  ON enrollments FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (SELECT 1 FROM courses c WHERE c.id = enrollments.course_id AND c.instructor_id = auth.uid())
  );