import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'react-hot-toast'

type Course = { id: string; title: string }
type Module = { id: string; title: string; order: number }
type Lesson = { id: string; title: string; description?: string; type: 'video' | 'simulation'; duration_minutes: number | null; order: number; video_url?: string | null; youtube_url?: string | null }
type Assessment = { id: string; title: string; module_id: string }

const AdminCourseContent: React.FC = () => {
  const { user, isAdmin } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [modules, setModules] = useState<Module[]>([])
  const [selectedModuleId, setSelectedModuleId] = useState('')
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)

  // Draft state
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [newLesson, setNewLesson] = useState<{ title: string; description: string; type: 'video'; duration: string; videoUrl?: string; youtubeUrl?: string }>({ title: '', description: '', type: 'video', duration: '', videoUrl: '', youtubeUrl: '' })
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [addingModule, setAddingModule] = useState(false)
  const [addingLesson, setAddingLesson] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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
        .select('id, title, description, type, duration_minutes, "order", video_url, youtube_url')
        .eq('module_id', selectedModuleId)
        .order('order', { ascending: true })
      if (!error) setLessons((data as Lesson[]) || [])

      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('id, title, module_id')
        .eq('module_id', selectedModuleId)
        .single()
      if (!assessmentError) setAssessment(assessmentData as Assessment)
      else setAssessment(null)
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
        description: newLesson.description,
        type: newLesson.type,
        duration_minutes: duration,
        order: nextLessonOrder,
      }
      if (newLesson.type === 'video') {
        if (newLesson.videoUrl) payload.video_url = newLesson.videoUrl
        if (newLesson.youtubeUrl) payload.youtube_url = newLesson.youtubeUrl
      }
      const { data, error } = await supabase
        .from('lessons')
        .insert(payload)
        .select('*')
        .single()
      if (error) throw error

      const created = data as Lesson
      setLessons([...lessons, created])
      setNewLesson({ title: '', description: '', type: 'video', duration: '', videoUrl: '', youtubeUrl: '' })
      toast.success('Lesson added')

          } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to add lesson')
    } finally {
      setAddingLesson(false)
    }
  }

  const handleUpdateLesson = async () => {
    if (!editingLesson) return
    try {
      const { data, error } = await supabase
        .from('lessons')
        .update({
          title: editingLesson.title,
          description: editingLesson.description,
          duration_minutes: editingLesson.duration_minutes,
          video_url: editingLesson.video_url,
          youtube_url: editingLesson.youtube_url,
        })
        .eq('id', editingLesson.id)
        .select('*')
        .single()

      if (error) throw error

      setLessons(lessons.map(l => l.id === editingLesson.id ? data as Lesson : l))
      toast.success('Lesson updated')
      closeEditModal()
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to update lesson')
    }
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) return
    try {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId)
      if (error) throw error
      setLessons(lessons.filter(l => l.id !== lessonId))
      toast.success('Lesson deleted')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to delete lesson')
    }
  }

  const openEditModal = (lesson: Lesson) => {
    setEditingLesson(lesson)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditingLesson(null)
    setIsEditModalOpen(false)
  }

  const handleAddAssessment = async () => {
    if (!selectedModuleId) return
    const title = prompt('Enter assessment title:')
    if (!title) return

    try {
      const { data, error } = await supabase
        .from('assessments')
        .insert({ module_id: selectedModuleId, title })
        .select('*')
        .single()

      if (error) throw error
      setAssessment(data as Assessment)
      toast.success('Assessment added')
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to add assessment')
    }
  }


  return (
    <div className="p-6">
      {isEditModalOpen && editingLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Edit Lesson</h2>
            <div className="grid grid-cols-1 gap-4">
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Lesson title..."
                value={editingLesson.title}
                onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
              />
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Lesson description..."
                value={editingLesson.description || ''}
                onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
              />
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Duration (minutes)"
                value={editingLesson.duration_minutes || ''}
                onChange={(e) => setEditingLesson({ ...editingLesson, duration_minutes: parseInt(e.target.value) || null })}
              />
              {editingLesson.type === 'video' && (
                <>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Video URL or Storage Path"
                    value={editingLesson.video_url || ''}
                    onChange={(e) => setEditingLesson({ ...editingLesson, video_url: e.target.value, youtube_url: '' })}
                  />
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="YouTube Video URL"
                    value={editingLesson.youtube_url || ''}
                    onChange={(e) => setEditingLesson({ ...editingLesson, youtube_url: e.target.value, video_url: '' })}
                  />
                </>
              )}
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={closeEditModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">Cancel</button>
              <button onClick={handleUpdateLesson} className="bg-blue-600 text-white px-4 py-2 rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}

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
                {selectedModuleId && !assessment && (
                  <div className="mt-4">
                    <button onClick={handleAddAssessment} className="w-full text-sm bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-md">Add Assessment</button>
                  </div>
                )}
                {assessment && (
                  <div className="mt-4 text-sm text-gray-700">Assessment: {assessment.title}</div>
                )}
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
                        <div className="flex items-center space-x-2">
                          <button onClick={() => openEditModal(l)} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded-md">Edit</button>
                          <button onClick={() => handleDeleteLesson(l.id)} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded-md">Delete</button>
                        </div>
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
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:col-span-2"
                    placeholder="Lesson description..."
                    value={newLesson.description}
                    onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                  />
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={newLesson.type}
                    onChange={(e) => setNewLesson({ ...newLesson, type: e.target.value as any, videoUrl: '' })}
                  >
                    <option value="video">Video</option>
                                      </select>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Duration (minutes)"
                    value={newLesson.duration}
                    onChange={(e) => setNewLesson({ ...newLesson, duration: e.target.value })}
                  />
                  {newLesson.type === 'video' && (
                    <>
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:col-span-2"
                      placeholder="Video URL or Storage Path (e.g., videos/intro.mp4)"
                      value={newLesson.videoUrl}
                      onChange={(e) => setNewLesson({ ...newLesson, videoUrl: e.target.value, youtubeUrl: '' })}
                    />
                    <input
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 md:col-span-2"
                      placeholder="YouTube Video URL"
                      value={newLesson.youtubeUrl}
                      onChange={(e) => setNewLesson({ ...newLesson, youtubeUrl: e.target.value, videoUrl: '' })}
                    />
                    </>
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
