export type UUID = string

export type UserRole = 'admin' | 'instructor' | 'student'

export interface User {
  id: UUID
  email: string | null
  full_name: string | null
  avatar_url?: string | null
  role: UserRole
  created_at?: string
  updated_at?: string
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export interface Course {
  id: UUID
  title: string
  description?: string | null
  thumbnail_url?: string | null
  duration_hours: number
  difficulty_level: DifficultyLevel
  instructor_id: UUID
  is_published?: boolean
  created_at?: string
  updated_at?: string
}

export interface CourseModule {
  id: UUID
  course_id: UUID
  title: string
  description?: string | null
  order: number
  created_at?: string
  updated_at?: string
}

export type LessonType = 'video' | 'assessment' | 'simulation'

export interface Lesson {
  id: UUID
  module_id: UUID
  title: string
  description?: string
  content?: string | null
  video_url?: string | null
  youtube_url?: string | null
  duration_minutes?: number
  order: number
  type: LessonType
  created_at?: string
  updated_at?: string
}

export interface Assessment {
  id: UUID
  module_id: UUID
  title: string
  passing_score: number
  time_limit_seconds?: number | null
  created_at?: string
  updated_at?: string
}

export interface AssessmentQuestion {
  id: UUID
  assessment_id: UUID
  question_text: string
  created_at?: string
  updated_at?: string
}

export interface AssessmentOption {
  id: UUID
  question_id: UUID
  option_text: string
  is_correct: boolean
}

export interface AssessmentAttempt {
  id: UUID
  assessment_id: UUID
  user_id: UUID
  score?: number | null
  passed?: boolean | null
  started_at?: string
  submitted_at?: string | null
  attempt_number: number
}

export interface AssessmentAnswer {
  id: UUID
  attempt_id: UUID
  question_id: UUID
  selected_option_id?: UUID | null
  is_correct?: boolean | null
}

export interface Enrollment {
  id: UUID
  user_id: UUID
  course_id: UUID
  enrolled_at?: string
  progress_percentage?: number
  completed_at?: string | null
  last_accessed_lesson_id?: UUID | null
}
