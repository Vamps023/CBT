import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-hot-toast'

type Course = { id: string; title: string }
type Module = { id: string; title: string; order: number }
type Lesson = { id: string; title: string; type: 'video' | 'assessment' | 'simulation'; duration_minutes: number | null; order: number; video_url?: string | null }

const AdminCourseContent: React.FC = () => {
  const { user, isAdmin } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [modules, setModules] = useState<Module[]>([])
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [lessons, setLessons] = useState<Lesson[]>([])

  // Draft state
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newLesson, setNewLesson] = useState<{ title: string; type: 'video' | 'assessment'; duration: string; videoUrl?: string }>({ title: '', type: 'video', duration: '', videoUrl: '' })
  const [addingModule, setAddingModule] = useState(false)
  const [addingLesson, setAddingLesson] = useState(false)

  // Load courses
  useEffect(() => {
    const loadCourses = async () => {
      if (!user) return
      let query = supabase.from('courses').select('id, title').order('title', { ascending: true })
      if (!isAdmin) query = query.eq('instructor_id', user.id)
      const { data, error } = await query
      if (!error) setCourses((data as Course[]) || [])
    }
    loadCourses()
  }, [user, isAdmin])

  // Load modules when course changes
  useEffect(() => {
    const loadModules = async () => {
      if (!selectedCourseId) {
        setModules([])
        setSelectedModuleId('')
        setLessons([])
        return
      }
      const { data, error } = await supabase
        .from('course_modules')
        .select('id, title, "order"')
        .eq('course_id', selectedCourseId)
        .order('order', { ascending: true })
      if (!error) setModules(((data as any[]) || []).map(m => ({ id: m.id, title: m.title, order: m.order })))
    }
    loadModules()
  }, [selectedCourseId])

  // Load lessons when module changes
  useEffect(() => {
    const loadLessons = async () => {
      if (!selectedModuleId) {
        setLessons([])
        return
      }
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, type, duration_minutes, "order", video_url')
        .eq('module_id', selectedModuleId)
        .order('order', { ascending: true })
      if (!error) setLessons((data as Lesson[]) || [])
    }
    loadLessons()
  }, [selectedModuleId])

  const nextModuleOrder = useMemo(() => (modules[modules.length - 1]?.order || 0) + 1, [modules])
  const nextLessonOrder = useMemo(() => (lessons[lessons.length - 1]?.order || 0) + 1, [lessons])

  const handleAddModule = async () => {
    const title = newModuleTitle.trim()
    if (!selectedCourseId || !title) {
      toast.error('Select a course and enter module title')
      return
    }
    try {
      setAddingModule(true)
      const { data, error } = await supabase
        .from('course_modules')
        .insert({ course_id: selectedCourseId, title, order: nextModuleOrder })
        .select('id, title, "order"')
        .single()
      if (error) throw error
      setModules([...modules, { id: (data as any).id, title: (data as any).title, order: (data as any).order }])
      setNewModuleTitle('')
      toast.success('Module added')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to add module')
    } finally {
      setAddingModule(false)
    }
  }

  const handleAddLesson = async () => {
    const title = newLesson.title.trim()
    const duration = parseInt(newLesson.duration || '0', 10) || null
    if (!selectedModuleId || !title) {
      toast.error('Select a module and enter lesson title')
      return
    }
    try {
      setAddingLesson(true)
      const payload: any = {
        module_id: selectedModuleId,
        title,
        type: newLesson.type,
        duration_minutes: duration,
        order: nextLessonOrder,
      }
      if (newLesson.type === 'video' && newLesson.videoUrl) {
        payload.video_url = newLesson.videoUrl
      }

      const { data, error } = await supabase
        .from('lessons')
        .insert(payload)
        .select('id, title, type, duration_minutes, "order", video_url')
        .single()
      if (error) throw error

      const created = data as Lesson
      setLessons([...lessons, created])
      setNewLesson({ title: '', type: 'video', duration: '', videoUrl: '' })
      toast.success('Lesson added')

      // If assessment lesson, ensure an assessment record exists
      if (created.type === 'assessment') {
        const { error: assessErr } = await supabase
          .from('assessments')
          .insert({ lesson_id: created.id, title: `${created.title || 'Assessment'}` })
        if (assessErr) console.error(assessErr)
      }
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to add lesson')
    } finally {
      setAddingLesson(false)
    }
  }


  return (
    <div className="p-6">
            <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Course Content</h1>
      </div>
      <p className="text-gray-600 mb-6">Create, organize, and manage course structures, modules, and lessons.</p>

      {/* Course Selection & Creation */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="max-w-md">
          {/* Course Selection */}
          <div>
            <label htmlFor="course-select" className="block text-sm font-medium text-gray-700 mb-1">Select a Course</label>
            <select
              id="course-select"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">Select a course to manage...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content Management Section */}
      {selectedCourseId && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Modules Column */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Add Module Card */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Add Module</h3>
              <div className="flex items-center space-x-2">
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="New module title..."
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                />
                <button onClick={handleAddModule} disabled={addingModule || !newModuleTitle.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex-shrink-0">
                  {addingModule ? '...' : 'Add'}
                </button>
              </div>
            </div>
            {/* Modules List Card */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Modules</h3>
              <div className="space-y-2">
                {modules.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModuleId(m.id)}
                    className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ${selectedModuleId === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 hover:bg-gray-50 border-gray-300'}`}
                  >
                    {m.title}
                  </button>
                ))}
                {modules.length === 0 && <div className="text-sm text-gray-500 py-2">No modules yet.</div>}
              </div>
            </div>
          </div>

          {/* Lessons Column */}
          {selectedModuleId && (
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Lessons List Card */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Lessons</h3>
                <div className="space-y-2">
                  {lessons.map(l => (
                    <div key={l.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{l.title} <span className="text-xs font-normal text-gray-500">({l.type})</span></div>
                          {l.type === 'video' && l.video_url && (
                            <div className="text-xs text-gray-500 break-all">{l.video_url}</div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">Order: {l.order}</div>
                      </div>
                    </div>
                  ))}
                  {lessons.length === 0 && <div className="text-sm text-gray-500 py-2">No lessons in this module.</div>}
                </div>
              </div>
              {/* Add Lesson Card */}
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Add Lesson</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:col-span-2"
                    placeholder="Lesson title..."
                    value={newLesson.title}
                    onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                  />
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newLesson.type}
                    onChange={(e) => setNewLesson({ ...newLesson, type: e.target.value as any, videoUrl: '' })}
                  >
                    <option value="video">Video</option>
                    <option value="assessment">Assessment</option>
                  </select>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Duration (minutes)"
                    value={newLesson.duration}
                    onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                  />
                  {newLesson.type === 'video' && (
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:col-span-2"
                      placeholder="Video URL or Storage Path (e.g., videos/intro.mp4)"
                      value={newLesson.videoUrl}
                      onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                    />
                  )}
                </div>
                <button onClick={handleAddLesson} disabled={addingLesson || !newLesson.title.trim()} className={`w-full mt-4 px-4 py-2 text-white rounded-lg transition-colors ${addingLesson ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400 disabled:cursor-not-allowed`}>
                  {addingLesson ? 'Adding...' : 'Add Lesson'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminCourseContent
