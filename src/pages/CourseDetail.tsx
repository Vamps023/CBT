import React, { useState, useEffect, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Course } from '../lib/supabase'
import type { Lesson } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Clock, Users, Play, FileText, Cuboid as Cube, CheckCircle, ArrowLeft } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import Assessment from '../components/Assessment'
import TrainSimulation from '../components/TrainSimulation'

const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)
  const [modules, setModules] = useState<Array<{ id: string; title: string; order: number }>>([])
  const [lessonsByModule, setLessonsByModule] = useState<Record<string, Array<Lesson>>>({})
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        if (!courseId) return

        // 1) Fetch course
        const { data: courseRow, error: courseErr } = await supabase
          .from('courses')
          .select('*, instructor:instructor_id(full_name)')
          .eq('id', courseId)
          .single()
        if (courseErr) throw courseErr
        setCourse(courseRow as Course)

        // 2) Instructor name is denormalized in courseRow.instructor_name

        // 3) Check enrollment for current user
        if (user) {
          const { data: enrollRow, error: enrollErr } = await supabase
            .from('enrollments')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .maybeSingle()
          if (!enrollErr && enrollRow) setEnrolled(true)
          else setEnrolled(false)
        } else {
          setEnrolled(false)
        }

        // 4) Fetch modules and lessons
        const { data: mods, error: modsErr } = await supabase
          .from('course_modules')
          .select('id, title, "order"')
          .eq('course_id', courseId)
          .order('order', { ascending: true })
        if (modsErr) throw modsErr
        const normalizedModules = (mods || []).map(m => ({ id: m.id, title: m.title, order: m.order }))
        setModules(normalizedModules)

        if (normalizedModules.length) {
          const moduleIds = normalizedModules.map(m => m.id);
          const { data: lessons, error: lessonsErr } = await supabase
            .from('lessons')
            .select('id, module_id, title, duration_minutes, "order", type')
            .in('module_id', moduleIds)
            .order('order', { ascending: true });
          if (lessonsErr) throw lessonsErr;

          // Also fetch assessments for these modules
          const { data: assessments, error: assessErr } = await supabase
            .from('assessments')
            .select('id, module_id, title, passing_score')
            .in('module_id', moduleIds);
          if (assessErr) throw assessErr;

          const grouped: Record<string, Array<Lesson>> = {};
          for (const l of lessons || []) {
            if (!grouped[l.module_id]) grouped[l.module_id] = [];
            grouped[l.module_id].push(l as Lesson);
          }

          // Inject a synthetic simulation entry per module to expose 3D interaction
          for (const m of normalizedModules) {
            if (!grouped[m.id]) grouped[m.id] = []
            grouped[m.id].push({
              id: `simulation:${m.id}`,
              module_id: m.id as any,
              title: '3D Interaction',
              duration_minutes: 0,
              order: 9998,
              type: 'simulation' as any,
            } as Lesson)
          }

          // Inject one synthetic assessment entry per module that has an assessment
          for (const a of assessments || []) {
            if (!grouped[a.module_id]) grouped[a.module_id] = [];
            grouped[a.module_id].push({
              id: `assessment:${a.id}`,
              module_id: a.module_id as any,
              title: a.title || 'Assessment',
              duration_minutes: 0,
              order: 9999,
              type: 'assessment' as any,
            } as Lesson);
          }

          setLessonsByModule(grouped);

          // Set the first item as selected by default
          const firstModuleId = normalizedModules[0].id;
          if (grouped[firstModuleId] && grouped[firstModuleId].length > 0) {
            setSelectedLesson(grouped[firstModuleId][0]);
          }
        } else {
          setLessonsByModule({});
        }
      } catch (e) {
        console.error('Failed to load course detail:', e)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [courseId, user])

  const handleEnroll = async () => {
    if (!user || !courseId) return
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert([{ user_id: user.id, course_id: courseId, progress_percentage: 0 }])
      if (error) throw error
      setEnrolled(true)
    } catch (e) {
      console.error('Failed to enroll:', e)
    }
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-1/3 mb-8"></div>
            <div className="bg-white rounded-xl p-8">
              <div className="h-64 bg-gray-300 rounded-lg mb-6"></div>
              <div className="h-8 bg-gray-300 rounded w-2/3 mb-4"></div>
              <div className="h-20 bg-gray-300 rounded mb-6"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Course not found</h2>
          <Link to="/courses" className="text-blue-600 hover:text-blue-700">
            Back to courses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/courses"
          className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Course Header */}
              <div className="relative">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-64 object-cover"
                />
                {enrolled && (
                  <div className="absolute top-4 left-4">
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Enrolled
                    </span>
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getDifficultyColor(course.difficulty_level)}`}>
                    {course.difficulty_level}
                  </span>
                </div>
              </div>

              <div className="p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
                <p className="text-gray-600 mb-6">{course.description}</p>

                <div className="flex items-center text-sm text-gray-500 mb-6 space-x-6">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{(course as any).instructor?.full_name || 'Instructor'}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{course.duration_hours} hours</span>
                  </div>
                </div>

                {enrolled ? (
                  <div className="mt-6">
                    {!selectedLesson && (
                      <div className="text-center py-12">
                        <h3 className="text-xl font-semibold text-gray-700">Select a lesson to begin</h3>
                        <p className="text-gray-500 mt-2">Choose a lesson from the course content list to start learning.</p>
                      </div>
                    )}
                    {selectedLesson?.type === 'video' && <VideoPlayer courseId={course.id} lessonId={selectedLesson.id} />}
                    {selectedLesson?.type === 'assessment' && <Assessment moduleId={selectedLesson.module_id} />}
                    {selectedLesson?.type === 'simulation' && (
                      <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-600">Loading 3D...</div>}>
                        <TrainSimulation courseId={course.id} />
                      </Suspense>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      Enroll to access course content
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Get full access to video training, assessments, and 3D simulations
                    </p>
                    {user ? (
                      <button
                        onClick={handleEnroll}
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Enroll Now
                      </button>
                    ) : (
                      <Link
                        to="/signin"
                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
                      >
                        Sign In to Enroll
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Content</h3>
              <div className="space-y-3">
                {modules.map((m) => (
                  <div key={m.id} className="">
                    <div className="text-sm font-semibold text-gray-800 mb-2">{m.title}</div>
                    {(lessonsByModule[m.id] || []).map((l) => {
                      const isSelected = selectedLesson?.id === l.id;
                      const Icon = l.type === 'assessment' ? FileText : l.type === 'simulation' ? Cube : Play;
                      return (
                        <button 
                          key={l.id} 
                          onClick={() => setSelectedLesson(l)}
                          className={`w-full flex items-center justify-between py-2 px-3 rounded-md transition-colors ${
                            isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'
                          }`}>
                          <div className="flex items-center">
                            <Icon className={`h-4 w-4 mr-3 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                            <span className={`text-sm ${isSelected ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>{l.title}</span>
                          </div>
                          <span className="text-xs text-gray-500">{l.duration_minutes || 0} min</span>
                        </button>
                      )
                    })}
                  </div>
                ))}
                {modules.length === 0 && (
                  <div className="text-sm text-gray-500">No content available yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetail