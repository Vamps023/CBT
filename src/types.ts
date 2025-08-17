// Shared types for the Course Graph Editor and related features

export type Course = {
  id: string
  title: string
  description?: string
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  duration_hours?: number
  created_at?: string
  updated_at?: string
}

export type CourseModule = {
  id: string
  course_id: string
  title: string
  description?: string
  order?: number
  created_at?: string
  updated_at?: string
}

export type Lesson = {
  id: string
  module_id: string
  title: string
  description?: string
  type?: 'video' | 'assessment' | 'simulation'
  duration_minutes?: number
  order?: number
  video_url?: string
  youtube_url?: string
  created_at?: string
  updated_at?: string
}

export type Assessment = {
  id: string
  module_id: string
  title: string
  passing_score?: number
  time_limit_seconds?: number
  created_at?: string
  updated_at?: string
}

export type AssessmentQuestion = {
  id: string
  assessment_id: string
  question_text: string
  order?: number
  points?: number
  created_at?: string
  updated_at?: string
}

export type AssessmentOption = {
  id: string
  question_id: string
  option_text: string
  is_correct?: boolean
  order?: number
  created_at?: string
  updated_at?: string
}
