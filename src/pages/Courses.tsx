import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Course } from '../lib/supabase'
import { Clock, Users, BookOpen, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface CourseWithInstructor extends Course {}

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<CourseWithInstructor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        setError(null)
        
        if (user) {
          // Logged-in student: show only enrolled courses
          const { data, error: enrollErr } = await supabase
            .from('enrollments')
            .select(`
              course:courses!enrollments_course_id_fkey (
                id,
                title,
                description,
                thumbnail_url,
                duration_hours,
                difficulty_level,
                instructor_name
              )
            `)
            .eq('user_id', user.id)
          if (enrollErr) throw enrollErr
          const mapped: CourseWithInstructor[] = (data || [])
            .map((row: any) => row.course)
            .filter(Boolean)
          if (mapped.length > 0) {
            setCourses(mapped)
          } else {
            // Fallback: show published catalog so students can browse and enroll
            const { data: coursesData, error: coursesError } = await supabase
              .from('courses')
              .select('*')
              .eq('is_published', true)
              .order('created_at', { ascending: false })
            if (coursesError) throw coursesError
            setCourses((coursesData as CourseWithInstructor[]) || [])
          }
        } else {
          // Guest: show published catalog
          const { data: coursesData, error: coursesError } = await supabase
            .from('courses')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
          if (coursesError) throw coursesError
          setCourses((coursesData as CourseWithInstructor[]) || [])
        }
      } catch (err) {
        console.error('Error fetching courses:', err)
        setError('Failed to load courses. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user])

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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                <div className="bg-gray-300 h-48"></div>
                <div className="p-6">
                  <div className="h-6 bg-gray-300 rounded mb-2"></div>
                  <div className="h-4 bg-gray-300 rounded mb-4"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 rounded w-20"></div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-900">No courses available</h2>
          <p className="mt-2 text-gray-600">Check back later for new courses or contact support if you believe this is an error.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Train Simulation Courses</h1>
          <p className="text-xl text-gray-600">
            Comprehensive Computer-Based Training programs designed for railway professionals
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/course/${course.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <div className="relative">
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getDifficultyColor(course.difficulty_level)}`}>
                    {course.difficulty_level}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {course.description}
                </p>

                <div className="flex items-center text-sm text-gray-500 mb-4">
                  <Users className="h-4 w-4 mr-1" />
                  <span className="mr-4">{course.instructor_name}</span>
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{course.duration_hours}h</span>
                </div>

                <div className="flex items-center justify-between">
                  <div />
                  <div className="flex items-center text-blue-600">
                    <BookOpen className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">View Course</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Courses