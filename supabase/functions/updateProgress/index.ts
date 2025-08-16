// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import 'https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts'
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  try {
    const body = await req.json()
    const { userId, courseId, lessonId } = body as { userId: string; courseId: string; lessonId?: string }
    if (!userId || !courseId) return new Response(JSON.stringify({ error: 'userId and courseId required' }), { status: 400 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Ensure enrollment exists
    const { data: enr, error: enrErr } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()
    if (enrErr || !enr) return new Response(JSON.stringify({ error: 'enrollment not found' }), { status: 404 })

    if (lessonId) {
      // upsert completed_lesson
      await supabase
        .from('completed_lessons')
        .upsert({ enrollment_id: enr.id, lesson_id: lessonId }, { onConflict: 'enrollment_id,lesson_id' })
    }

    // recompute progress
    const { data: moduleIds } = await supabase.from('course_modules').select('id').eq('course_id', courseId)
    const ids = moduleIds?.map((m: any) => m.id) || []
    const [{ count: total }, { count: done }] = await Promise.all([
      supabase.from('lessons').select('*', { count: 'exact', head: true }).in('module_id', ids),
      supabase.from('completed_lessons').select('*', { count: 'exact', head: true }).eq('enrollment_id', enr.id),
    ])
    const pct = total && total > 0 && done ? Math.min(100, Math.round((done / total) * 100)) : 0
    await supabase.from('enrollments').update({ progress_percentage: pct }).eq('id', enr.id)

    return new Response(JSON.stringify({ progress: pct }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
