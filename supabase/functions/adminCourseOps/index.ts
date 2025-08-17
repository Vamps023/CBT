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

type Action = 'update' | 'delete' | 'bulkDelete' | 'bulkPublish' | 'togglePublish'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Auth-aware client for reading the current user from the bearer token
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    })

    // Admin client for privileged writes (we will enforce our own checks)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Get the requesting user
    const { data: userData, error: userErr } = await authClient.auth.getUser()
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    const requesterId = userData.user.id

    // Helper: get requester role via RPC, which uses auth context (avoids table coupling and PGRST116)
    let requesterRole: 'admin' | 'instructor' | 'student' | null = null
    try {
      const { data: roleData, error: roleErr } = await authClient.rpc('get_user_role')
      if (!roleErr && roleData) {
        requesterRole = roleData as typeof requesterRole
      }
    } catch (_) {
      // ignore; default null
    }

    const body = await req.json()
    const action: Action = body?.action
    const payload = body?.payload || {}

    if (!action) return new Response(JSON.stringify({ error: 'action required' }), { status: 400, headers: corsHeaders })

    // Helper: ensure permission for course ids
    const ensureCanManageCourses = async (courseIds: string[]) => {
      if (requesterRole === 'admin') return { ok: true }
      if (!courseIds.length) return { ok: true }

      const { data, error } = await adminClient
        .from('courses')
        .select('id, instructor_id')
        .in('id', courseIds)
      if (error) return { ok: false, error: error.message }

      const unauthorized = (data || []).find((c: any) => c.instructor_id !== requesterId)
      if (unauthorized) return { ok: false, error: 'Forbidden: not instructor of all courses' }
      return { ok: true }
    }

    if (action === 'delete') {
      const { courseId } = payload as { courseId: string }
      if (!courseId) return new Response(JSON.stringify({ error: 'courseId required' }), { status: 400, headers: corsHeaders })

      const perm = await ensureCanManageCourses([courseId])
      if (!perm.ok) return new Response(JSON.stringify({ error: perm.error || 'Forbidden' }), { status: 403, headers: corsHeaders })

      const { error } = await adminClient.from('courses').delete().eq('id', courseId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    if (action === 'bulkDelete') {
      const { ids } = payload as { ids: string[] }
      if (!ids || !Array.isArray(ids) || ids.length === 0) return new Response(JSON.stringify({ error: 'ids required' }), { status: 400, headers: corsHeaders })

      const perm = await ensureCanManageCourses(ids)
      if (!perm.ok) return new Response(JSON.stringify({ error: perm.error || 'Forbidden' }), { status: 403, headers: corsHeaders })

      const { error } = await adminClient.from('courses').delete().in('id', ids)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ success: true, deleted: ids.length }), { status: 200, headers: corsHeaders })
    }

    if (action === 'bulkPublish') {
      const { ids, is_published } = payload as { ids: string[]; is_published: boolean }
      if (!ids || typeof is_published !== 'boolean') return new Response(JSON.stringify({ error: 'ids and is_published required' }), { status: 400, headers: corsHeaders })

      const perm = await ensureCanManageCourses(ids)
      if (!perm.ok) return new Response(JSON.stringify({ error: perm.error || 'Forbidden' }), { status: 403, headers: corsHeaders })

      const { error } = await adminClient
        .from('courses')
        .update({ is_published, updated_at: new Date().toISOString() })
        .in('id', ids)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ success: true, updated: ids.length }), { status: 200, headers: corsHeaders })
    }

    if (action === 'togglePublish') {
      const { courseId, nextPublished } = payload as { courseId: string; nextPublished: boolean }
      if (!courseId || typeof nextPublished !== 'boolean') return new Response(JSON.stringify({ error: 'courseId and nextPublished required' }), { status: 400, headers: corsHeaders })

      const perm = await ensureCanManageCourses([courseId])
      if (!perm.ok) return new Response(JSON.stringify({ error: perm.error || 'Forbidden' }), { status: 403, headers: corsHeaders })

      const { error } = await adminClient
        .from('courses')
        .update({ is_published: nextPublished, updated_at: new Date().toISOString() })
        .eq('id', courseId)
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    if (action === 'update') {
      const { courseId, data } = payload as { courseId: string; data: Record<string, any> }
      if (!courseId || !data) return new Response(JSON.stringify({ error: 'courseId and data required' }), { status: 400, headers: corsHeaders })

      const perm = await ensureCanManageCourses([courseId])
      if (!perm.ok) return new Response(JSON.stringify({ error: perm.error || 'Forbidden' }), { status: 403, headers: corsHeaders })

      // Whitelist updatable fields
      const allowedFields = ['title', 'description', 'thumbnail_url', 'duration_hours', 'difficulty_level', 'is_published']
      const updateData: Record<string, any> = {}
      for (const k of allowedFields) if (k in data) updateData[k] = data[k]
      updateData.updated_at = new Date().toISOString()

      const { data: updated, error } = await adminClient
        .from('courses')
        .update(updateData)
        .eq('id', courseId)
        .select()
        .single()
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      return new Response(JSON.stringify({ success: true, course: updated }), { status: 200, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
  }
})
