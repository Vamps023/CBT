// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import 'https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
const baseCorsHeaders = (origin)=>({
    'Access-Control-Allow-Origin': origin && origin !== 'null' ? origin : '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  });
serve(async (req)=>{
  const origin = req.headers.get('origin');
  const corsHeaders = baseCorsHeaders(origin);
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', {
    status: 405,
    headers: corsHeaders
  });
  try {
    const body = await req.json();
    const { assessmentId, answers, userId } = body;
    if (!assessmentId || !userId) return new Response(JSON.stringify({
      error: 'assessmentId and userId required'
    }), {
      status: 400,
      headers: corsHeaders
    });
    if (!Array.isArray(answers)) return new Response(JSON.stringify({
      error: 'answers must be an array'
    }), {
      status: 400,
      headers: corsHeaders
    });
    const safeAnswers = answers.filter((a)=>a && typeof a.questionId === 'string' && typeof a.selectedOptionId === 'string');
    if (!safeAnswers.length) return new Response(JSON.stringify({
      error: 'answers array is empty or invalid'
    }), {
      status: 400,
      headers: corsHeaders
    });
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Load question ids for this assessment (robust, no embedded join)
    const { data: questions, error: qErr } = await supabase.from('assessment_questions').select('id').eq('assessment_id', assessmentId);
    if (qErr) return new Response(JSON.stringify({
      error: `Failed to load questions: ${qErr.message}`
    }), {
      status: 500,
      headers: corsHeaders
    });
    const qids = (questions || []).map((q)=>q.id);
    // Load options correctness map for these questions
    let correctByOption = new Map();
    if (qids.length) {
      const { data: options, error: oerr } = await supabase.from('assessment_options').select('id, is_correct, question_id').in('question_id', qids);
      if (oerr) return new Response(JSON.stringify({
        error: `Failed to load options: ${oerr.message}`
      }), {
        status: 500,
        headers: corsHeaders
      });
      correctByOption = new Map((options || []).map((o)=>[
          o.id,
          Boolean(o.is_correct)
        ]));
    }
    // Fallback: if some selected option ids are not in the map, fetch them directly
    const selectedOptionIds = Array.isArray(safeAnswers) ? safeAnswers.map((a)=>a.selectedOptionId) : [];
    const missingIds = selectedOptionIds.filter((id)=>!correctByOption.has(id));
    if (missingIds.length) {
      const { data: missingOpts, error: missErr } = await supabase.from('assessment_options').select('id, is_correct').in('id', missingIds);
      if (!missErr && Array.isArray(missingOpts)) {
        for (const o of missingOpts)correctByOption.set(o.id, Boolean(o.is_correct));
      }
    }
    // Create attempt (retry without started_at if column missing)
    let attemptRes = await supabase.from('assessment_attempts').insert({
      assessment_id: assessmentId,
      user_id: userId,
      started_at: new Date().toISOString()
    }).select().single();
    if (attemptRes.error) {
      const msg = String(attemptRes.error.message || '');
      const code = attemptRes.error.code;
      const missingCol = code === '42703' || msg.toLowerCase().includes('column') || msg.toLowerCase().includes('does not exist');
      if (missingCol) {
        attemptRes = await supabase.from('assessment_attempts').insert({
          assessment_id: assessmentId,
          user_id: userId
        }).select().single();
      }
    }
    if (attemptRes.error) return new Response(JSON.stringify({
      error: attemptRes.error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
    const attempt = attemptRes.data;
    let correct = 0;
    const rows = safeAnswers.map((ans)=>{
      const isCorrect = correctByOption.get(ans.selectedOptionId) === true;
      if (isCorrect) correct += 1;
      return {
        attempt_id: attempt.id,
        question_id: ans.questionId,
        selected_option_id: ans.selectedOptionId,
        is_correct: isCorrect
      };
    });
    if (rows.length) {
      const { error: insErr } = await supabase.from('assessment_answers').insert(rows);
      if (insErr) {
        // If the table doesn't exist in this project, skip recording per-question answers
        const msg = String(insErr.message || '');
        const code = insErr.code;
        const missingTable = code === '42P01' || msg.toLowerCase().includes('assessment_answers') || msg.toLowerCase().includes('schema cache') || msg.toLowerCase().includes('does not exist');
        if (!missingTable) {
          return new Response(JSON.stringify({
            error: `Insert answers failed: ${insErr.message}`
          }), {
            status: 500,
            headers: corsHeaders
          });
        }
      }
    }
    // Compute score
    const { count: totalQ, error: tqErr } = await supabase.from('assessment_questions').select('*', {
      count: 'exact',
      head: true
    }).eq('assessment_id', assessmentId);
    if (tqErr) return new Response(JSON.stringify({
      error: `Failed to count questions: ${tqErr.message}`
    }), {
      status: 500,
      headers: corsHeaders
    });
    const score = totalQ && totalQ > 0 ? Math.round(correct / totalQ * 100) : 0;
    const passed = score >= 80;
    let upd = await supabase.from('assessment_attempts').update({
      score,
      passed
    }).eq('id', attempt.id);
    if (upd.error) {
      const msg = String(upd.error.message || '');
      const code = upd.error.code;
      const missingCol = code === '42703' || msg.toLowerCase().includes("column") || msg.toLowerCase().includes('schema cache') || msg.toLowerCase().includes('does not exist');
      if (missingCol) {
        upd = await supabase.from('assessment_attempts').update({
          score
        }).eq('id', attempt.id);
      }
    }
    if (upd.error && !(String(upd.error.message || '').toLowerCase().includes('column') || upd.error.code === '42703')) {
      return new Response(JSON.stringify({
        error: upd.error.message
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    const debug = {
      correct,
      totalQ: totalQ ?? null,
      evaluated: Array.isArray(safeAnswers) ? safeAnswers.length : 0,
      missingOptionIds: missingIds,
      mappedOptionCount: correctByOption.size
    };
    return new Response(JSON.stringify({
      attemptId: attempt.id,
      score,
      passed,
      debug
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (e) {
    // Ensure CORS headers on error responses as well
    const origin2 = req.headers.get('origin');
    return new Response(JSON.stringify({
      error: String(e)
    }), {
      status: 500,
      headers: baseCorsHeaders(origin2)
    });
  }
});
