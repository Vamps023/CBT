import React, { useState, useEffect } from 'react'
import { BookOpen, Users, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0
  })
  const [recentCourses, setRecentCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Get total courses count
      const { count: totalCoursesCount, error: totalCoursesError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })

      if (totalCoursesError) throw totalCoursesError

      // Get published courses count
      const { count: publishedCoursesCount, error: publishedCoursesError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true)

      if (publishedCoursesError) throw publishedCoursesError

      // Get total students count
      const { count: studentCount, error: studentError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')

      if (studentError) throw studentError

      // Get total enrollments
      const { count: enrollmentCount, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })

      if (enrollmentError) throw enrollmentError

      setStats({
        totalCourses: totalCoursesCount || 0,
        publishedCourses: publishedCoursesCount || 0,
        totalStudents: studentCount || 0,
        totalEnrollments: enrollmentCount || 0
      })

      // Fetch recent courses for list
      const { data: recent, error: recentError } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, duration_hours, difficulty_level, instructor_id, is_published, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentError) throw recentError

      // Batch fetch instructor names
      if (recent && recent.length > 0) {
        const instructorIds = Array.from(new Set(recent.map(c => c.instructor_id).filter(Boolean)))
        let instructorsById: Record<string, string> = {}
        if (instructorIds.length > 0) {
          const { data: instructors, error: instructorsError } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', instructorIds as string[])
          if (instructorsError) throw instructorsError
          instructorsById = (instructors || []).reduce((acc: Record<string, string>, u: any) => {
            acc[u.id] = u.full_name || 'Unknown Instructor'
            return acc
          }, {})
        }

        const recentWithInstructors = recent.map(c => ({
          ...c,
          instructor_name: instructorsById[c.instructor_id] || 'Unknown Instructor'
        }))
        setRecentCourses(recentWithInstructors)
      } else {
        setRecentCourses([])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (isPublished: boolean) => {
    return isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="h-4 bg-gray-300 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-300 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your course management system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <BookOpen className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">{stats.publishedCourses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Total Students</h3>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalStudents.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Enrollments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEnrollments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Courses</h2>
          </div>
          <div className="p-6">
            {recentCourses.length > 0 ? (
              <div className="space-y-4">
                {recentCourses.map((course) => (
                  <div key={course.id} className="flex items-center space-x-4">
                    {course.thumbnail_url && (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {course.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(course.is_published)}`}>
                          {course.is_published ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(course.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-sm text-gray-500 justify-end">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{course.duration_hours} hours</span>
                        </div>
                        <div className="ml-4 flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>By {course.instructor_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No courses created yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard