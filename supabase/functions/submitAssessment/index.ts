// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import 'https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts'
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  try {
    const body = await req.json()
    const { assessmentId, answers, userId } = body as { assessmentId: string; answers: Array<{ questionId: string; selectedOptionId: string }>; userId: string }
    if (!assessmentId || !userId) return new Response(JSON.stringify({ error: 'assessmentId and userId required' }), { status: 400 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Load options correctness map
    const { data: options, error: oerr } = await supabase
      .from('assessment_options')
      .select('id, is_correct, question_id, question:question_id ( assessment_id )')
      .eq('question.assessment_id', assessmentId)
    if (oerr) return new Response(JSON.stringify({ error: oerr.message }), { status: 500 })

    const correctByOption = new Map(options.map((o: any) => [o.id, !!o.is_correct]))

    // Next attempt number
    const { count: existingCount } = await supabase
      .from('assessment_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('assessment_id', assessmentId)
      .eq('user_id', userId)

    const attemptNumber = (existingCount || 0) + 1
    const { data: attempt, error: aerr } = await supabase
      .from('assessment_attempts')
      .insert({ assessment_id: assessmentId, user_id: userId, attempt_number: attemptNumber, started_at: new Date().toISOString() })
      .select()
      .single()
    if (aerr) return new Response(JSON.stringify({ error: aerr.message }), { status: 500 })

    let correct = 0
    const rows = answers.map((ans) => {
      const isCorrect = correctByOption.get(ans.selectedOptionId) === true
      if (isCorrect) correct += 1
      return { attempt_id: attempt.id, question_id: ans.questionId, selected_option_id: ans.selectedOptionId, is_correct: isCorrect }
    })

    if (rows.length) {
      const { error: insErr } = await supabase.from('assessment_answers').insert(rows)
      if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500 })
    }

    // Compute score
    const { count: totalQ } = await supabase
      .from('assessment_questions')
      .select('*', { count: 'exact', head: true })
      .eq('assessment_id', assessmentId)

    const score = totalQ && totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0
    const passed = score >= 80

    const { error: updErr } = await supabase
      .from('assessment_attempts')
      .update({ score, passed, submitted_at: new Date().toISOString() })
      .eq('id', attempt.id)
    if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 500 })

    return new Response(JSON.stringify({ attemptId: attempt.id, score, passed }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
