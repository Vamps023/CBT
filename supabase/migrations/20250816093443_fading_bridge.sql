/*
  # Course Management System Database Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `instructors`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `bio` (text)
      - `avatar_url` (text)
      - `created_at` (timestamp)
    
    - `admin_courses` (enhanced courses table)
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `price` (decimal)
      - `duration_hours` (integer)
      - `category_id` (uuid, foreign key)
      - `instructor_id` (uuid, foreign key)
      - `status` (enum: draft, published, archived)
      - `thumbnail_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `course_enrollments`
      - `id` (uuid, primary key)
      - `course_id` (uuid, foreign key)
      - `student_id` (uuid, foreign key)
      - `enrolled_at` (timestamp)
      - `completed_at` (timestamp, nullable)

  2. Security
    - Enable RLS on all tables
    - Add admin-only policies for course management
    - Add read policies for public course viewing

  3. Indexes
    - Add indexes for better query performance
*/

-- Create enum for course status
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Instructors table
CREATE TABLE IF NOT EXISTS instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Enhanced courses table for admin management
CREATE TABLE IF NOT EXISTS admin_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  price decimal(10,2) DEFAULT 0,
  duration_hours integer DEFAULT 0,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  instructor_id uuid REFERENCES instructors(id) ON DELETE SET NULL,
  status course_status DEFAULT 'draft',
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Course enrollments table
CREATE TABLE IF NOT EXISTS course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES admin_courses(id) ON DELETE CASCADE,
  student_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(course_id, student_id)
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

-- Admin policies (assuming admin role is stored in user metadata)
CREATE POLICY "Admins can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage instructors"
  ON instructors
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can manage courses"
  ON admin_courses
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can view enrollments"
  ON course_enrollments
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Public read policies
CREATE POLICY "Anyone can view published courses"
  ON admin_courses
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Anyone can view categories"
  ON categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can view instructors"
  ON instructors
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_courses_category ON admin_courses(category_id);
CREATE INDEX IF NOT EXISTS idx_admin_courses_instructor ON admin_courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_admin_courses_status ON admin_courses(status);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(student_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_admin_courses_updated_at
  BEFORE UPDATE ON admin_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO categories (name, description) VALUES
  ('Programming', 'Software development and programming courses'),
  ('Design', 'UI/UX design and graphic design courses'),
  ('Business', 'Business management and entrepreneurship courses'),
  ('Marketing', 'Digital marketing and sales courses'),
  ('Data Science', 'Data analysis and machine learning courses')
ON CONFLICT (name) DO NOTHING;

INSERT INTO instructors (name, email, bio, avatar_url) VALUES
  ('John Smith', 'john.smith@example.com', 'Senior Software Engineer with 10+ years experience', 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150'),
  ('Sarah Johnson', 'sarah.johnson@example.com', 'UX Designer and Design Systems Expert', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150'),
  ('Michael Chen', 'michael.chen@example.com', 'Business Strategy Consultant', 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150'),
  ('Emily Davis', 'emily.davis@example.com', 'Digital Marketing Specialist', 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150')
ON CONFLICT (email) DO NOTHING;

-- Insert sample courses
INSERT INTO admin_courses (title, description, price, duration_hours, category_id, instructor_id, status, thumbnail_url)
SELECT 
  'React Development Masterclass',
  'Complete guide to building modern web applications with React',
  199.99,
  40,
  c.id,
  i.id,
  'published',
  'https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg?auto=compress&cs=tinysrgb&w=800'
FROM categories c, instructors i 
WHERE c.name = 'Programming' AND i.email = 'john.smith@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO admin_courses (title, description, price, duration_hours, category_id, instructor_id, status, thumbnail_url)
SELECT 
  'UI/UX Design Fundamentals',
  'Learn the principles of user interface and user experience design',
  149.99,
  25,
  c.id,
  i.id,
  'published',
  'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800'
FROM categories c, instructors i 
WHERE c.name = 'Design' AND i.email = 'sarah.johnson@example.com'
ON CONFLICT DO NOTHING;