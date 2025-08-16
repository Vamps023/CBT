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
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')
  const [creatingCourse, setCreatingCourse] = useState(false)
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

  const handleCreateCourse = async () => {
    const title = newCourseTitle.trim()
    if (!user || !title) {
      toast.error('Enter course title')
      return
    }
    try {
      setCreatingCourse(true)
      const { data, error } = await supabase
        .from('courses')
        .insert({ title, description: newCourseDesc || null, instructor_id: user.id })
        .select('id, title')
        .single()
      if (error) throw error
      const created = data as Course
      setCourses([...(courses || []), created])
      setSelectedCourseId(created.id)
      setNewCourseTitle('')
      setNewCourseDesc('')
      toast.success('Course created')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to create course')
    } finally {
      setCreatingCourse(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Course Content Management</h1>

      {/* Create & Select Course */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Create Course</label>
          <div className="space-y-2">
            <input
              className="border px-3 py-2 rounded w-full"
              placeholder="Course title"
              value={newCourseTitle}
              onChange={(e) => setNewCourseTitle(e.target.value)}
            />
            <input
              className="border px-3 py-2 rounded w-full"
              placeholder="Short description (optional)"
              value={newCourseDesc}
              onChange={(e) => setNewCourseDesc(e.target.value)}
            />
            <button
              onClick={handleCreateCourse}
              disabled={creatingCourse}
              className={`px-4 py-2 rounded text-white ${creatingCourse ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {creatingCourse ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Course</label>
          <select
            className="border px-3 py-2 rounded w-full"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="">Select a course</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Add Module */}
        {selectedCourseId && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Add Module</label>
            <div className="flex">
              <input
                className="border px-3 py-2 rounded-l w-full"
                placeholder="Module title"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
              />
              <button onClick={handleAddModule} disabled={addingModule} className={`px-4 py-2 text-white rounded-r ${addingModule ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {addingModule ? 'Adding...' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modules list */}
      {selectedCourseId && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Modules</h2>
          <div className="flex flex-wrap gap-2">
            {modules.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedModuleId(m.id)}
                className={`px-3 py-1 rounded border ${selectedModuleId === m.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'}`}
              >
                {m.title}
              </button>
            ))}
            {modules.length === 0 && <div className="text-sm text-gray-500">No modules yet.</div>}
          </div>
        </div>
      )}

      {/* Lessons + Add Lesson */}
      {selectedModuleId && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="font-semibold mb-2">Lessons</h3>
            <div className="space-y-2">
              {lessons.map(l => (
                <div key={l.id} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{l.title} <span className="text-xs text-gray-500">({l.type})</span></div>
                      {l.type === 'video' && l.video_url && (
                        <div className="text-xs text-gray-500 break-all">{l.video_url}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">Order: {l.order}</div>
                  </div>
                </div>
              ))}
              {lessons.length === 0 && <div className="text-sm text-gray-500">No lessons yet.</div>}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Add Lesson</h3>
            <div className="space-y-3 border rounded p-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Title</label>
                <input
                  className="border px-3 py-2 rounded w-full"
                  value={newLesson.title}
                  onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type</label>
                <select
                  className="border px-3 py-2 rounded w-full"
                  value={newLesson.type}
                  onChange={(e) => setNewLesson({ ...newLesson, type: e.target.value as any })}
                >
                  <option value="video">Video</option>
                  <option value="assessment">Assessment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  className="border px-3 py-2 rounded w-full"
                  value={newLesson.duration}
                  onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                />
              </div>
              {newLesson.type === 'video' && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Video URL or Storage Path</label>
                  <input
                    className="border px-3 py-2 rounded w-full"
                    placeholder="https://... or videos/filename.mp4"
                    value={newLesson.videoUrl}
                    onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value })}
                  />
                </div>
              )}
              <button onClick={handleAddLesson} disabled={addingLesson} className={`w-full px-4 py-2 text-white rounded ${addingLesson ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {addingLesson ? 'Adding...' : 'Add Lesson'}
              </button>
              <p className="text-xs text-gray-500">Assessment lessons automatically get a blank assessment created.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCourseContent
