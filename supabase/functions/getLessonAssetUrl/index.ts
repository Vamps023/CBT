// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
import 'https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts'
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0'

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const lessonId = url.searchParams.get('lessonId')
    if (!lessonId) return new Response(JSON.stringify({ error: 'lessonId required' }), { status: 400 })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch lesson to get video_url and ensure access control
    const { data: lesson, error: lerr } = await supabase
      .from('lessons')
      .select('id, module_id, video_url, type, module:module_id ( course:course_id ( id, is_published ) )')
      .eq('id', lessonId)
      .maybeSingle()
    if (lerr || !lesson) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })

    const rawUrl: string | null = (lesson as any).video_url
    if (!rawUrl) return new Response(JSON.stringify({ url: null }), { status: 200 })

    if (/^https?:\/\//i.test(rawUrl)) {
      return new Response(JSON.stringify({ url: rawUrl }), { status: 200 })
    }

    const { data: signed, error: signErr } = await supabase.storage.from('videos').createSignedUrl(rawUrl, 60 * 60)
    if (signErr) return new Response(JSON.stringify({ error: signErr.message }), { status: 500 })

    return new Response(JSON.stringify({ url: signed.signedUrl }), { status: 200 })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
