import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-hot-toast'
import type {
  Course,
  CourseModule,
  Lesson,
  Assessment as TAssessment,
  AssessmentQuestion,
  AssessmentOption,
  UUID,
} from '../../types'
import {
  listCoursesForUser,
  getModules,
  getLessons,
  getAssessmentByLesson,
  createAssessment,
  getQuestions,
  getOptionsForQuestions,
  addQuestion as svcAddQuestion,
  addOption as svcAddOption,
} from '../../services/supabase/assessments'

const AdminAssessments: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<UUID>('')
  const [modules, setModules] = useState<CourseModule[]>([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [assessment, setAssessment] = useState<TAssessment | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [newQuestion, setNewQuestion] = useState('')
  const [optionDrafts, setOptionDrafts] = useState<Record<UUID, { text: string; correct: boolean }>>({})
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<UUID, AssessmentOption[]>>({})
  const [savingOptionByQuestion, setSavingOptionByQuestion] = useState<Record<UUID, boolean>>({})

  // Simple in-memory caches to avoid re-fetching (refs avoid extra re-renders)
  const modulesCacheRef = useRef<Record<UUID, CourseModule[]>>({})
  const lessonsCacheRef = useRef<Record<UUID, Lesson[]>>({})
  const assessmentCacheRef = useRef<Record<UUID, TAssessment>>({}) // key: lesson_id
  const questionsCacheRef = useRef<Record<UUID, AssessmentQuestion[]>>({}) // key: assessment_id

  // Abort controllers to cancel stale requests
  const modulesAbortRef = useRef<AbortController | null>(null)
  const lessonsAbortRef = useRef<AbortController | null>(null)
  const questionsAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        setLoadingCourses(true)
        const data = await listCoursesForUser(user.id, !!isAdmin)
        setCourses(data)
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load courses')
      } finally {
        setLoadingCourses(false)
      }
    }
    load()
  }, [user, isAdmin])

  useEffect(() => {
    const loadMods = async () => {
      if (!selectedCourse) return
      try {
        // Serve from cache if available
        if (modulesCacheRef.current[selectedCourse]?.length) {
          setModules(modulesCacheRef.current[selectedCourse])
          return
        }
        // cancel any in-flight
        modulesAbortRef.current?.abort()
        modulesAbortRef.current = new AbortController()
        setLoadingModules(true)
        const data = await getModules(selectedCourse)
        const normalized = (data || []).map((m) => ({ id: m.id, course_id: selectedCourse, title: m.title, order: m.order } as CourseModule))
        setModules(normalized)
        modulesCacheRef.current[selectedCourse] = normalized
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load modules')
      } finally {
        setLoadingModules(false)
      }
      setLessons([])
      setAssessment(null)
      setQuestions([])
    }
    loadMods()
  }, [selectedCourse])

  const loadLessons = async (moduleId: string) => {
    try {
      // Cache first
      if (lessonsCacheRef.current[moduleId]?.length) {
        setLessons(lessonsCacheRef.current[moduleId])
        return
      }
      // cancel any in-flight
      lessonsAbortRef.current?.abort()
      lessonsAbortRef.current = new AbortController()
      setLoadingLessons(true)
      const data = await getLessons(moduleId)
      setLessons(data)
      lessonsCacheRef.current[moduleId] = data
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load lessons')
    } finally {
      setLoadingLessons(false)
    }
  }

  const ensureAssessment = async (lessonId: string) => {
    try {
      // Use cached assessment if present
      const cached = assessmentCacheRef.current[lessonId]
      const a = cached || (await getAssessmentByLesson(lessonId))
      if (a) {
        setAssessment(a)
        if (!cached) assessmentCacheRef.current[lessonId] = a
        await loadQuestions(a.id)
        return
      }
      const created = await createAssessment(lessonId, 'New Assessment')
      setAssessment(created)
      assessmentCacheRef.current[lessonId] = created
      setQuestions([])
      setOptionsByQuestion({})
    } catch (e: any) {
      toast.error(e?.message || 'Failed to ensure assessment')
    }
  }

  const loadQuestions = async (assessmentId: string) => {
    try {
      // Serve from cache if available
      const cached = questionsCacheRef.current[assessmentId]
      // cancel any in-flight
      questionsAbortRef.current?.abort()
      questionsAbortRef.current = new AbortController()
      setLoadingQuestions(true)
      const qs = cached || (await getQuestions(assessmentId))
      setQuestions(qs)
      if (!cached) questionsCacheRef.current[assessmentId] = qs
      // Do not fetch all options up-front; load lazily per-question to reduce initial payload
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load questions')
    } finally {
      setLoadingQuestions(false)
    }
  }

  const loadOptions = async (questionIds: string[]) => {
    if (!questionIds.length) {
      setOptionsByQuestion({})
      return
    }
    try {
      const data = await getOptionsForQuestions(questionIds)
      const grouped: Record<UUID, AssessmentOption[]> = {}
      for (const opt of data) {
        grouped[opt.question_id] = grouped[opt.question_id] || []
        grouped[opt.question_id].push(opt)
      }
      // Merge into existing map so we don't drop other questions' options
      setOptionsByQuestion((prev) => ({ ...prev, ...grouped }))
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load options')
    }
  }

  const addQuestion = async () => {
    if (!assessment || !newQuestion.trim()) return
    const nextIndex = (questions[questions.length - 1]?.order_index || 0) + 1
    try {
      const created = await svcAddQuestion(assessment.id, newQuestion.trim(), nextIndex)
      setQuestions([...questions, created])
      setNewQuestion('')
      await loadOptions([created.id])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add question')
    }
  }

  const saveOption = async (questionId: string) => {
    const draft = optionDrafts[questionId]
    const text = draft?.text?.trim()
    if (!text) return
    try {
      setSavingOptionByQuestion((p) => ({ ...p, [questionId]: true }))
      // optimistic add
      const tempId = `temp-${Date.now()}`
      setOptionsByQuestion((prev) => {
        const arr = prev[questionId] || []
        return {
          ...prev,
          [questionId]: [
            ...arr,
            { id: tempId, question_id: questionId, option_text: text, is_correct: !!draft?.correct } as unknown as AssessmentOption,
          ],
        }
      })
      await svcAddOption(questionId, text, !!draft?.correct)
      toast.success('Option added')
      await loadOptions([questionId])
      setOptionDrafts({ ...optionDrafts, [questionId]: { text: '', correct: false } })
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add option')
      // revert optimistic
      setOptionsByQuestion((prev) => {
        const arr = (prev[questionId] || []).filter((o: any) => !String(o.id).startsWith('temp-'))
        return { ...prev, [questionId]: arr }
      })
    } finally {
      setSavingOptionByQuestion((p) => ({ ...p, [questionId]: false }))
    }
  }

  const setOptionDraft = (questionId: string, partial: { text?: string; correct?: boolean }) => {
    const current = optionDrafts[questionId] || { text: '', correct: false }
    const updated = { ...current, ...partial }
    setOptionDrafts({ ...optionDrafts, [questionId]: updated })
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Assessments</h1>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Course</label>
          <select className="border px-3 py-2 rounded w-full" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)}>
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          {loadingCourses && (
            <p className="text-xs text-gray-500 mt-1">Loading courses...</p>
          )}
          {!loadingCourses && courses.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">No courses found.</p>
          )}
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Modules</label>
          {loadingModules && <p className="text-xs text-gray-500">Loading modules...</p>}
          {!loadingModules && selectedCourse && modules.length === 0 && (
            <p className="text-xs text-gray-500">No modules found for this course.</p>
          )}
          {modules.length > 0 && (
            <div className="space-x-2">
              {modules.map((m) => (
                <button key={m.id} className="px-3 py-1 border rounded mb-2" onClick={() => loadLessons(m.id)}>{m.title}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="font-semibold mb-2">Lessons</h2>
        {loadingLessons && <p className="text-xs text-gray-500">Loading lessons...</p>}
        {!loadingLessons && modules.length > 0 && lessons.length === 0 && (
          <p className="text-xs text-gray-500">Select a module to view lessons. No lessons loaded yet.</p>
        )}
        {lessons.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lessons.map((l) => (
              <div key={l.id} className="border rounded p-3">
                <div className="font-medium">{l.title} <span className="text-xs text-gray-500">({l.type})</span></div>
                <div className="mt-2 space-x-2">
                  <button className="text-sm px-3 py-1 bg-blue-600 text-white rounded" onClick={() => ensureAssessment(l.id)}>Open/Create Assessment</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {assessment && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Assessment: {assessment.title}</h3>
            <div className="text-sm text-gray-600">Passing Score: {assessment.passing_score}%</div>
          </div>

          <div className="mb-4 flex">
            <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="New question" className="border px-3 py-2 rounded flex-1 mr-2" />
            <button onClick={addQuestion} className="px-4 py-2 bg-green-600 text-white rounded">Add Question</button>
          </div>

          <div className="space-y-4">
            {loadingQuestions && (
              <p className="text-xs text-gray-500">Loading questions...</p>
            )}
            {questions.map((q) => (
              <div key={q.id} className="border rounded p-3">
                <div className="font-medium mb-2">{q.prompt}</div>
                <div className="flex items-center space-x-2">
                  <input
                    className="border px-2 py-1 rounded flex-1"
                    placeholder="Option text"
                    value={optionDrafts[q.id]?.text || ''}
                    onChange={(e) => setOptionDraft(q.id, { text: e.target.value })}
                  />
                  <label className="text-sm flex items-center space-x-1">
                    <input type="checkbox" checked={!!optionDrafts[q.id]?.correct} onChange={(e) => setOptionDraft(q.id, { correct: e.target.checked })} />
                    <span>Correct</span>
                  </label>
                  <button
                    className={`px-3 py-1 text-white rounded ${savingOptionByQuestion[q.id] ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    disabled={!!savingOptionByQuestion[q.id]}
                    onClick={() => saveOption(q.id)}
                  >
                    {savingOptionByQuestion[q.id] ? 'Saving...' : 'Add Option'}
                  </button>
                </div>
                {optionsByQuestion[q.id]?.length ? (
                  <ul className="mt-2 space-y-1">
                    {optionsByQuestion[q.id].map((o: any) => (
                      <li key={o.id} className="text-sm flex items-center justify-between">
                        <span>{o.option_text}</span>
                        {o.is_correct && <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Correct</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-2">
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => loadOptions([q.id])}>Load options</button>
                    <p className="text-xs text-gray-500">No options loaded.</p>
                  </div>
                )}
              </div>
            ))}
            {!loadingQuestions && questions.length === 0 && (
              <p className="text-xs text-gray-500">No questions added yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAssessments
