import { supabase } from '../../lib/supabase'
import type { User } from '../../types'

export async function getByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, avatar_url')
    .eq('email', email.toLowerCase())
    .maybeSingle()
  if (error) throw error
  return data as User | null
}

export async function getManyByIds(ids: string[]) {
  if (ids.length === 0) return [] as User[]
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, avatar_url')
    .in('id', ids)
  if (error) throw error
  return (data || []) as User[]
}
