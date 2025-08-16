import React, { useEffect, useRef, useState } from 'react'
import { Check, Plus, Loader2 } from 'lucide-react'
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
            <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Assessment Editor</h1>
      </div>
      <p className="text-gray-600 mb-6">Select a course, module, and lesson to view or edit its assessment.</p>

      {/* Selection Flow */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Courses */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3">1. Select Course</h3>
          {loadingCourses && <Loader2 className="animate-spin h-5 w-5 text-gray-500" />}
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            disabled={loadingCourses}
          >
            <option value="">{loadingCourses ? 'Loading...' : 'Choose a course'}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Modules */}
        <div className={`bg-white p-4 rounded-lg border ${selectedCourse ? 'border-gray-200' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className={`text-lg font-medium mb-3 ${selectedCourse ? 'text-gray-900' : 'text-gray-500'}`}>2. Select Module</h3>
          {loadingModules && <Loader2 className="animate-spin h-5 w-5 text-gray-500" />}
          <div className="space-y-2">
            {modules.map((m) => (
              <button key={m.id} className="w-full text-left px-3 py-2 border rounded-md text-sm transition-colors border-gray-300 hover:bg-gray-50" onClick={() => loadLessons(m.id)}>{m.title}</button>
            ))}
          </div>
          {!loadingModules && selectedCourse && modules.length === 0 && <p className="text-sm text-gray-500">No modules found.</p>}
        </div>

        {/* Lessons */}
        <div className={`bg-white p-4 rounded-lg border ${lessons.length > 0 ? 'border-gray-200' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className={`text-lg font-medium mb-3 ${lessons.length > 0 ? 'text-gray-900' : 'text-gray-500'}`}>3. Select Lesson</h3>
          {loadingLessons && <Loader2 className="animate-spin h-5 w-5 text-gray-500" />}
          <div className="space-y-2">
            {lessons.map((l) => (
              <div key={l.id} className="border rounded-lg p-3 bg-gray-50 text-sm">
                <div className="font-medium text-gray-800">{l.title} <span className="font-normal text-gray-500">({l.type})</span></div>
                {l.type === 'assessment' && (
                  <button className="text-xs mt-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors" onClick={() => ensureAssessment(l.id)}>Edit Assessment</button>
                )}
              </div>
            ))}
          </div>
          {!loadingLessons && modules.length > 0 && lessons.length === 0 && <p className="text-sm text-gray-500">Select a module.</p>}
        </div>
      </div>

      {/* Assessment Editor */}
      {assessment && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4 border-b pb-4">
            <h3 className="text-xl font-bold text-gray-900">Editing: {assessment.title}</h3>
            <div className="text-sm text-gray-600">Passing Score: {assessment.passing_score}%</div>
          </div>

          {/* Add Question Form */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-gray-800 mb-2">Add a New Question</h4>
            <div className="flex items-center space-x-2">
              <input
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Type your question here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button onClick={addQuestion} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2 flex-shrink-0">
                <Plus size={18} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {loadingQuestions && <Loader2 className="animate-spin h-5 w-5 text-gray-500" />}
            {questions.map((q) => (
              <div key={q.id} className="border rounded-lg p-4 bg-gray-50">
                <p className="font-medium text-gray-800 mb-3">{q.prompt}</p>
                
                {/* Options List */}
                <ul className="space-y-2 mb-3">
                  {(optionsByQuestion[q.id] || []).map((o: any) => (
                    <li key={o.id} className={`text-sm flex items-center justify-between p-2 rounded-md ${o.is_correct ? 'bg-green-100' : 'bg-white'}`}>
                      <span>{o.option_text}</span>
                      {o.is_correct && <Check size={16} className="text-green-600" />}
                    </li>
                  ))}
                </ul>
                {!(optionsByQuestion[q.id] || []).length && (
                  <button className="text-xs text-blue-600 hover:underline mb-3" onClick={() => loadOptions([q.id])}>Load/Reload options</button>
                )}

                {/* Add Option Form */}
                <div className="flex items-center space-x-2 border-t pt-3 mt-3">
                  <input
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="New option text..."
                    value={optionDrafts[q.id]?.text || ''}
                    onChange={(e) => setOptionDraft(q.id, { text: e.target.value })}
                  />
                  <label className="text-sm flex items-center space-x-2 flex-shrink-0">
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={!!optionDrafts[q.id]?.correct} onChange={(e) => setOptionDraft(q.id, { correct: e.target.checked })} />
                    <span>Correct</span>
                  </label>
                  <button
                    className="bg-gray-600 text-white px-3 py-2 text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400 flex items-center space-x-1"
                    disabled={!!savingOptionByQuestion[q.id]}
                    onClick={() => saveOption(q.id)}
                  >
                    {savingOptionByQuestion[q.id] ? <Loader2 className="animate-spin h-4 w-4"/> : <Plus size={16} />}
                    <span>Add</span>
                  </button>
                </div>
              </div>
            ))}
            {!loadingQuestions && questions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No questions have been added to this assessment yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAssessments
