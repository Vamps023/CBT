import { supabase } from '../../lib/supabase'
import type {
  UUID,
  Course,
  CourseModule,
  Lesson,
  Assessment,
  AssessmentQuestion,
  AssessmentOption,
} from '../../types'

export async function listCoursesForUser(userId: UUID, isAdmin: boolean): Promise<Pick<Course, 'id' | 'title' | 'instructor_id' | 'duration_hours' | 'difficulty_level'>[]> {
  let query = supabase
    .from('courses')
    .select('id, title, instructor_id, duration_hours, difficulty_level')
    .order('title', { ascending: true })
  if (!isAdmin) query = query.eq('instructor_id', userId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getModules(courseId: UUID): Promise<Pick<CourseModule, 'id' | 'course_id' | 'title' | 'order'>[]> {
  const { data, error } = await supabase
    .from('course_modules')
    .select('id, course_id, title, "order"')
    .eq('course_id', courseId)
    .order('order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getLessons(moduleId: UUID): Promise<Pick<Lesson, 'id' | 'module_id' | 'title' | 'type' | 'order'>[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, module_id, title, type, "order"')
    .eq('module_id', moduleId)
    .order('order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getAssessmentByModule(moduleId: UUID): Promise<Pick<Assessment, 'id' | 'module_id' | 'title' | 'passing_score'> | null> {
  const { data, error } = await supabase
    .from('assessments')
    .select('id, module_id, title, passing_score')
    .eq('module_id', moduleId)
    .maybeSingle()
  if (error) throw error
  return data || null
}

export async function createAssessment(moduleId: UUID, title = 'New Assessment'): Promise<Pick<Assessment, 'id' | 'module_id' | 'title' | 'passing_score'>> {
  const { data, error } = await supabase
    .from('assessments')
    .insert({ module_id: moduleId, title })
    .select('id, module_id, title, passing_score')
    .single()
  if (error) throw error
  return data
}

export async function getQuestions(assessmentId: UUID): Promise<Pick<AssessmentQuestion, 'id' | 'assessment_id' | 'prompt' | 'order_index'>[]> {
  const { data, error } = await supabase
    .from('assessment_questions')
    .select('id, assessment_id, prompt, order_index')
    .eq('assessment_id', assessmentId)
    .order('order_index', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getOptionsForQuestions(questionIds: UUID[]): Promise<Pick<AssessmentOption, 'id' | 'question_id' | 'option_text' | 'is_correct'>[]> {
  if (!questionIds.length) return []
  const { data, error } = await supabase
    .from('assessment_options')
    .select('id, question_id, option_text, is_correct')
    .in('question_id', questionIds)
  if (error) throw error
  return data || []
}

export async function addQuestion(assessmentId: UUID, prompt: string, order_index: number): Promise<Pick<AssessmentQuestion, 'id' | 'assessment_id' | 'prompt' | 'order_index'>> {
  const { data, error } = await supabase
    .from('assessment_questions')
    .insert({ assessment_id: assessmentId, prompt, order_index })
    .select('id, assessment_id, prompt, order_index')
  if (error) throw error
  return (data || [])[0]
}

export async function addOption(questionId: UUID, option_text: string, is_correct: boolean): Promise<Pick<AssessmentOption, 'id' | 'question_id' | 'option_text' | 'is_correct'>> {
  const { data, error } = await supabase
    .from('assessment_options')
    .insert({ question_id: questionId, option_text, is_correct })
    .select('id, question_id, option_text, is_correct')
  if (error) throw error
  return (data || [])[0]
}
