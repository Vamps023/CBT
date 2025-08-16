import { supabase } from '../../lib/supabase'
import type { Enrollment, UUID } from '../../types'
import { getByEmail } from './users'

export async function listByCourse(courseId: UUID) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('id, user_id, course_id')
    .eq('course_id', courseId)
  if (error) throw error
  return (data || []) as Enrollment[]
}

export async function addByEmail(courseId: UUID, email: string) {
  const user = await getByEmail(email)
  if (!user) throw new Error('User not found')

  // Check existing
  const { data: existing, error: exErr } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .maybeSingle()
  if (exErr) throw exErr
  if (existing) return { already: true, id: existing.id as UUID }

  const { data, error } = await supabase
    .from('enrollments')
    .insert({ user_id: user.id, course_id: courseId })
    .select('id')
    .maybeSingle()

  if (error) {
    const code = (error as any)?.code || ''
    if (code === '23505' || code === '409') {
      return { already: true }
    }
    throw error
  }
  return { created: true, id: (data as any)?.id as UUID }
}

export async function remove(enrollmentId: UUID) {
  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('id', enrollmentId)
  if (error) throw error
}
