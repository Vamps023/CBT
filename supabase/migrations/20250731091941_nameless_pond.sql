/*
  # Create CBT Training Platform Schema

  1. New Tables
    - `courses`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `thumbnail_url` (text)
      - `duration_hours` (integer)
      - `difficulty_level` (enum: beginner, intermediate, advanced)
      - `instructor_name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `enrollments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `course_id` (uuid, foreign key to courses)
      - `enrolled_at` (timestamp)
      - `progress_percentage` (integer, default 0)
      - `completed_at` (timestamp, nullable)
    
    - `course_content`
      - `id` (uuid, primary key)
      - `course_id` (uuid, foreign key to courses)
      - `title` (text)
      - `type` (enum: video, assessment, simulation)
      - `content_url` (text, nullable)
      - `order_index` (integer)
      - `duration_minutes` (integer, nullable)
    
    - `user_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `course_id` (uuid, foreign key to courses)
      - `content_id` (uuid, foreign key to course_content)
      - `progress_percentage` (integer, default 0)
      - `completed` (boolean, default false)
      - `last_accessed` (timestamp)
    
    - `user_profiles`
      - `id` (uuid, primary key, foreign key to auth.users)
      - `full_name` (text)
      - `avatar_url` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for course access based on enrollment
*/

-- Create custom types
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE content_type AS ENUM ('video', 'assessment', 'simulation');

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  thumbnail_url text,
  duration_hours integer NOT NULL DEFAULT 0,
  difficulty_level difficulty_level NOT NULL DEFAULT 'beginner',
  instructor_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at timestamptz DEFAULT now(),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at timestamptz,
  UNIQUE(user_id, course_id)
);

-- Create course_content table
CREATE TABLE IF NOT EXISTS course_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type content_type NOT NULL,
  content_url text,
  order_index integer NOT NULL,
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  content_id uuid REFERENCES course_content(id) ON DELETE CASCADE NOT NULL,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed boolean DEFAULT false,
  last_accessed timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for courses (public read access)
CREATE POLICY "Anyone can view courses"
  ON courses
  FOR SELECT
  TO public
  USING (true);

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for enrollments
CREATE POLICY "Users can view own enrollments"
  ON enrollments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own enrollments"
  ON enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments"
  ON enrollments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for course_content (public read for enrolled users)
CREATE POLICY "Anyone can view course content"
  ON course_content
  FOR SELECT
  TO public
  USING (true);

-- Create policies for user_progress
CREATE POLICY "Users can view own progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_content_course_id ON course_content(course_id);
CREATE INDEX IF NOT EXISTS idx_course_content_order ON course_content(course_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_course ON user_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_content ON user_progress(content_id);

-- Insert sample courses
INSERT INTO courses (title, description, thumbnail_url, duration_hours, difficulty_level, instructor_name) VALUES
  (
    'Railway Operations Fundamentals',
    'Learn the basics of railway operations, safety protocols, and operational procedures.',
    'https://images.pexels.com/photos/544966/pexels-photo-544966.jpeg?auto=compress&cs=tinysrgb&w=800',
    12,
    'beginner',
    'Sarah Johnson'
  ),
  (
    'Advanced Train Control Systems',
    'Master modern train control systems including ETCS, CBTC, and automated train operation.',
    'https://images.pexels.com/photos/2026324/pexels-photo-2026324.jpeg?auto=compress&cs=tinysrgb&w=800',
    18,
    'advanced',
    'Michael Chen'
  ),
  (
    'Signal Systems and Safety',
    'Comprehensive training on railway signaling systems, safety protocols, and emergency procedures.',
    'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
    15,
    'intermediate',
    'Emma Rodriguez'
  ),
  (
    'Locomotive Operation & Maintenance',
    'Hands-on training for locomotive operation, maintenance procedures, and troubleshooting.',
    'https://images.pexels.com/photos/2657659/pexels-photo-2657659.jpeg?auto=compress&cs=tinysrgb&w=800',
    24,
    'intermediate',
    'David Thompson'
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();