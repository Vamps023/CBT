import React, { useMemo, useState } from 'react'
import { supabaseAdmin } from '../../lib/supabase-admin'

// Minimal client-side validation to avoid extra deps
function validatePayload(payload: any): { ok: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') return { ok: false, error: 'Invalid JSON' }
  if (!payload.course) return { ok: false, error: 'Missing course' }
  if (!payload.course.title) return { ok: false, error: 'course.title required' }
  if (!Array.isArray(payload.modules)) return { ok: false, error: 'modules must be an array' }
  for (const m of payload.modules) {
    if (!m.title) return { ok: false, error: 'module.title required' }
    if (!Array.isArray(m.lessons)) return { ok: false, error: 'module.lessons must be an array' }
    for (const l of m.lessons) {
      if (!l.type || !l.title) return { ok: false, error: 'lesson.type and lesson.title required' }
      if (l.type === 'video' && !l.youtube_url) return { ok: false, error: `video lesson "${l.title}" missing youtube_url` }
      if (l.type === 'assessment') {
        if (!Array.isArray(l.questions) || !l.questions.length) return { ok: false, error: `assessment "${l.title}" requires questions` }
        for (const q of l.questions) {
          if (!q.text) return { ok: false, error: 'assessment question.text required' }
          if (!Array.isArray(q.options) || !q.options.length) return { ok: false, error: 'assessment question.options required' }
        }
      }
    }
  }
  return { ok: true }
}

function summarize(payload: any) {
  const modules = payload.modules || []
  let lessons = 0, assessments = 0, questions = 0, options = 0
  for (const m of modules) {
    for (const l of (m.lessons || [])) {
      lessons += 1
      if (l.type === 'assessment') {
        assessments += 1
        for (const q of (l.questions || [])) {
          questions += 1
          options += (q.options || []).length
        }
      }
    }
  }
  return { modules: modules.length, lessons, assessments, questions, options }
}

const example = {
  course: {
    slug: 'intro-to-rail-safety',
    title: 'Intro to Rail Safety',
    subtitle: 'Operate safely and efficiently',
    thumbnail_url: 'https://example.com/thumb.jpg',
    duration_minutes: 60,
    description: 'Learn basic operations, signals, and safety.'
  },
  modules: [
    {
      title: 'Basics',
      order: 1,
      lessons: [
        { type: 'video', title: 'Welcome', order: 1, duration_minutes: 2, youtube_url: 'https://www.youtube.com/watch?v=xxxxxxx' },
        {
          type: 'assessment', title: 'Quick Check', order: 2, passing_score: 60,
          questions: [
            { order: 1, text: 'What color means proceed?', options: [
              { order: 1, text: 'Red', is_correct: false },
              { order: 2, text: 'Green', is_correct: true },
              { order: 3, text: 'Yellow', is_correct: false },
            ]}
          ]
        },
        { type: 'simulation', title: '3D Interaction', order: 3, duration_minutes: 5 }
      ]
    }
  ]
}

export default function ImportCourse() {
  const [text, setText] = useState(JSON.stringify(example, null, 2))
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [probe, setProbe] = useState<string | null>(null)

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const functionUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/importCourse` : ''

  const payload = useMemo(() => {
    try { return JSON.parse(text) } catch { return null }
  }, [text])

  const summary = useMemo(() => payload ? summarize(payload) : null, [payload])

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    const str = await f.text()
    setText(str)
  }

  async function onImport() {
    setError(null)
    setResult(null)
    if (!payload) { setError('Invalid JSON'); return }
    const v = validatePayload(payload)
    if (!v.ok) { setError(v.error || 'Validation failed'); return }

    setLoading(true)
    try {
      const { data, error } = await supabaseAdmin.functions.invoke('importCourse', { body: payload })
      setLoading(false)
      if (error) {
        // Attempt to extract HTTP status and body
        let status: any = (error as any)?.context?.response?.status
        let bodyText: string | undefined = undefined
        try {
          const resp = (error as any)?.context?.response
          if (resp && typeof resp.text === 'function') bodyText = await resp.text()
        } catch {}
        setError(`${error.name || 'InvokeError'} (${status ?? 'n/a'}): ${error.message}${bodyText ? `\n${bodyText}` : ''}`)
        return
      }
      setResult(data)
    } catch (e: any) {
      setLoading(false)
      setError(`Unexpected error: ${e?.message || String(e)}`)
    }
  }

  async function testConnectivity() {
    setProbe(null)
    if (!functionUrl) {
      setProbe('VITE_SUPABASE_URL is empty. Set it in .env and restart dev server.')
      return
    }
    try {
      const resp = await fetch(functionUrl, { method: 'OPTIONS' })
      setProbe(`OPTIONS ${resp.status} ${resp.statusText}`)
    } catch (e: any) {
      setProbe(`Network error: ${e?.message || String(e)}`)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Import Course from JSON</h2>

      <div className="flex items-center gap-2">
        <input type="file" accept="application/json" onChange={onFileChange} />
        {fileName && <span className="text-sm text-gray-500">{fileName}</span>}
        <button
          className="ml-auto px-3 py-1.5 rounded bg-indigo-600 text-white disabled:opacity-50"
          disabled={!payload || loading}
          onClick={onImport}
        >{loading ? 'Importing…' : 'Import'}</button>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">JSON</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-72 font-mono text-sm p-2 border rounded"
        />
      </div>

      {summary && (
        <div className="text-sm text-gray-700">
          <div><b>Modules:</b> {summary.modules}</div>
          <div><b>Lessons:</b> {summary.lessons}</div>
          <div><b>Assessments:</b> {summary.assessments}</div>
          <div><b>Questions:</b> {summary.questions}</div>
          <div><b>Options:</b> {summary.options}</div>
        </div>
      )}

      {/* Diagnostics */}
      <div className="text-xs text-gray-600 space-y-1">
        <div><b>Supabase URL:</b> {supabaseUrl ? `${supabaseUrl.replace(/^(https?:\/\/)[^\.]+/, '$1***')}` : '(empty)'}</div>
        <div className="text-[10px] opacity-50 break-all">
          <div>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL || '(not set)'}</div>
          <div>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? '***' + import.meta.env.VITE_SUPABASE_ANON_KEY.slice(-4) : '(not set)'}</div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded bg-gray-200" onClick={testConnectivity}>Test Function Connectivity</button>
          {probe && <span>{probe}</span>}
        </div>
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      {result && (
        <div className="text-sm bg-green-50 border border-green-200 p-2 rounded">
          <div><b>Course ID:</b> {result.courseId}</div>
          <div><b>Modules:</b> {result.modules} | <b>Lessons:</b> {result.lessons}</div>
          <div><b>Assessments:</b> {result.assessments} | <b>Questions:</b> {result.questions} | <b>Options:</b> {result.options}</div>
          {result.errors?.length ? (
            <details className="mt-2">
              <summary className="cursor-pointer">Errors ({result.errors.length})</summary>
              <ul className="list-disc ml-6">
                {result.errors.map((e: any, i: number) => (
                  <li key={i}>{e.where}: {e.message}</li>
                ))}
              </ul>
            </details>
          ) : (
            <div className="text-green-700">No errors</div>
          )}
        </div>
      )}
    </div>
  )
}
