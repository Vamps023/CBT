// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import 'https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts'
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const payload = await req.json()

    if (!payload?.course || !payload?.modules || !Array.isArray(payload.modules)) {
      return new Response(JSON.stringify({ error: 'Invalid payload. Expect { course, modules: [] }' }), { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(supabaseUrl, serviceRole)

    const report = {
      courseId: null as string | null,
      modules: 0,
      lessons: 0,
      assessments: 0,
      questions: 0,
      options: 0,
      errors: [] as Array<{ where: string; message: string }>,
    }

    // Create course
    const c = payload.course
    const { data: courseData, error: courseError } = await db
      .from('courses')
      .insert({
        title: c.title,
        description: c.subtitle || c.description || '',
        thumbnail_url: c.thumbnail_url || null,
        duration_hours: Math.ceil((c.duration_minutes || 0) / 60),
        instructor_id: c.instructor_id || (await db.from('users').select('id').eq('role', 'admin').single()).data?.id,
        is_published: false,
      })
      .select('id')
      .single()

    if (courseError) throw courseError
    const courseId = courseData.id
    report.courseId = courseId

    // Modules
    for (const mod of payload.modules as any[]) {
      const { data: moduleData, error: moduleError } = await db
        .from('course_modules')
        .insert({
          course_id: courseId,
          title: mod.title,
          description: mod.description || '',
          order: mod.order || 1,
        })
        .select('id')
        .single()

      if (moduleError) {
        report.errors.push({ where: 'module', message: moduleError.message })
        continue
      }
      report.modules += 1
      const moduleId = moduleData.id

      // Lessons (and assessments)
      for (const lesson of (mod.lessons || []) as any[]) {
        const { data: lessonRow, error: lessonError } = await db
          .from('lessons')
          .insert({
            module_id: moduleId,
            title: lesson.title,
            content: lesson.description || '',
            video_url: lesson.youtube_url || null,
            duration_minutes: lesson.duration_minutes || 0,
            order: lesson.order || 1,
            type: lesson.type === 'assessment' ? 'assessment' : lesson.type || 'video',
          })
          .select('id')
          .single()

        if (lessonError || !lessonRow?.id) {
          report.errors.push({ where: 'lesson', message: lessonError?.message || 'Failed to create lesson' })
          continue
        }
        report.lessons += 1
        const lessonId = lessonRow.id

        if (lesson.type === 'assessment') {
          const { data: assessmentData, error: assessmentError } = await db
            .from('assessments')
            .insert({
              lesson_id: lessonId,
              title: lesson.title,
              passing_score: lesson.passing_score || 80,
              time_limit_seconds: lesson.duration_minutes ? lesson.duration_minutes * 60 : null,
            })
            .select('id')
            .single()

          if (assessmentError) {
            report.errors.push({ where: 'assessment', message: assessmentError.message })
            continue
          }
          report.assessments += 1
          const assessmentId = assessmentData.id

          // Questions
          for (const q of (lesson.questions || []) as any[]) {
            const { data: questionData, error: questionError } = await db
              .from('assessment_questions')
              .insert({
                assessment_id: assessmentId,
                prompt: q.text,
                order_index: q.order_index || q.order || 1,
              })
              .select('id')
              .single()

            if (questionError) {
              report.errors.push({ where: 'question', message: questionError.message })
              continue
            }
            report.questions += 1
            const questionId = questionData.id

            // Options
            for (const opt of (q.options || []) as any[]) {
              const { error: optionError } = await db
                .from('assessment_options')
                .insert({
                  question_id: questionId,
                  option_text: opt.text,
                  is_correct: !!opt.is_correct,
                })

              if (optionError) {
                report.errors.push({ where: 'option', message: optionError.message })
              } else {
                report.options += 1
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})