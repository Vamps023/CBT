/*
  # Sogeclair CBT Platform Database Schema

  1. New Tables
    - `user_profiles`
      - `id` (uuid, references auth.users)
      - `full_name` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
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
    
    - `course_content`
      - `id` (uuid, primary key)
      - `course_id` (uuid, foreign key)
      - `title` (text)
      - `type` (enum: video, assessment, simulation)
      - `content_url` (text, optional)
      - `order_index` (integer)
      - `duration_minutes` (integer, optional)
    
    - `enrollments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `course_id` (uuid, foreign key)
      - `enrolled_at` (timestamp)
      - `progress_percentage` (integer, default 0)
      - `completed_at` (timestamp, optional)
    
    - `user_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `course_id` (uuid, foreign key)
      - `content_id` (uuid, foreign key)
      - `progress_percentage` (integer, default 0)
      - `completed` (boolean, default false)
      - `last_accessed` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for public course browsing

  3. Sample Data
    - Insert sample courses for Railway Operations training
    - Create course content entries for videos, assessments, and simulations
*/

-- Create custom types
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE content_type AS ENUM ('video', 'assessment', 'simulation');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  thumbnail_url text NOT NULL,
  duration_hours integer NOT NULL DEFAULT 0,
  difficulty_level difficulty_level NOT NULL DEFAULT 'beginner',
  instructor_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create course_content table
CREATE TABLE IF NOT EXISTS course_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  type content_type NOT NULL,
  content_url text,
  order_index integer NOT NULL DEFAULT 0,
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at timestamptz,
  UNIQUE(user_id, course_id)
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  content_id uuid NOT NULL REFERENCES course_content(id) ON DELETE CASCADE,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed boolean DEFAULT false,
  last_accessed timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for courses (public read access)
CREATE POLICY "Anyone can read courses"
  ON courses
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create policies for course_content (public read access)
CREATE POLICY "Anyone can read course content"
  ON course_content
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Create policies for enrollments
CREATE POLICY "Users can read own enrollments"
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
  USING (auth.uid() = user_id);

-- Create policies for user_progress
CREATE POLICY "Users can read own progress"
  ON user_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON user_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_course_content_course_id ON course_content(course_id);
CREATE INDEX IF NOT EXISTS idx_course_content_order ON course_content(course_id, order_index);

-- Insert sample courses
INSERT INTO courses (id, title, description, thumbnail_url, duration_hours, difficulty_level, instructor_name) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Railway Operations Fundamentals',
  'Learn the basics of railway operations, safety protocols, and operational procedures. This comprehensive course covers everything from basic train operation to advanced safety systems.',
  'https://images.pexels.com/photos/544966/pexels-photo-544966.jpeg?auto=compress&cs=tinysrgb&w=800',
  12,
  'beginner',
  'Sarah Johnson'
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Advanced Train Control Systems',
  'Master modern train control systems including ETCS, CBTC, and automated train operation. Learn about signal processing, communication protocols, and safety systems.',
  'https://images.pexels.com/photos/2026324/pexels-photo-2026324.jpeg?auto=compress&cs=tinysrgb&w=800',
  18,
  'advanced',
  'Michael Chen'
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Signal Systems and Safety',
  'Comprehensive training on railway signaling systems, safety protocols, and emergency procedures. Understand interlocking systems and fail-safe operations.',
  'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
  15,
  'intermediate',
  'Emma Rodriguez'
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  'Locomotive Operation & Maintenance',
  'Hands-on training for locomotive operation, maintenance procedures, and troubleshooting. Learn about diesel and electric traction systems.',
  'https://images.pexels.com/photos/2657659/pexels-photo-2657659.jpeg?auto=compress&cs=tinysrgb&w=800',
  24,
  'intermediate',
  'David Thompson'
);

-- Insert sample course content for Railway Operations Fundamentals
INSERT INTO course_content (course_id, title, type, content_url, order_index, duration_minutes) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Introduction to Railway Operations',
  'video',
  'https://example.com/video1',
  1,
  15
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Safety Protocols and Procedures',
  'video',
  'https://example.com/video2',
  2,
  22
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Basic Knowledge Assessment',
  'assessment',
  null,
  3,
  10
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Train Controls Simulation',
  'simulation',
  null,
  4,
  30
);

-- Insert sample course content for Advanced Train Control Systems
INSERT INTO course_content (course_id, title, type, content_url, order_index, duration_minutes) VALUES
(
  '550e8400-e29b-41d4-a716-446655440002',
  'ETCS Overview and Implementation',
  'video',
  'https://example.com/video3',
  1,
  25
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'CBTC Systems and Operations',
  'video',
  'https://example.com/video4',
  2,
  30
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Advanced Control Systems Quiz',
  'assessment',
  null,
  3,
  15
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Control System Simulation',
  'simulation',
  null,
  4,
  45
);

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', 'User'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();