import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || ''

let options: SupabaseClientOptions<'public'> | undefined
if (functionsUrl) {
  options = { functions: { url: functionsUrl } } as SupabaseClientOptions<'public'>
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options)

export type Course = {
  id: string
  title: string
  description: string
  thumbnail_url: string
  duration_hours: number
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  instructor_id: string  // Reference to users.id
  instructor?: { full_name: string } | null // For joined queries
  is_published: boolean
  created_at: string
  updated_at: string
}

export type Enrollment = {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  progress_percentage: number
  completed_at?: string
}

export type CourseContent = {
  id: string
  course_id: string
  title: string
  type: 'video' | 'assessment' | 'simulation'
  content_url?: string
  order_index: number
  duration_minutes?: number
}

export type UserProgress = {
  id: string
  user_id: string
  course_id: string
  content_id: string
  progress_percentage: number
  completed: boolean
  last_accessed: string
}