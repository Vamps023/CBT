import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, Course } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Clock, Users, Star, Play, FileText, Cuboid as Cube, CheckCircle, ArrowLeft } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import Assessment from '../components/Assessment'
import TrainSimulation from '../components/TrainSimulation'

const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'video' | 'assessment' | 'simulation'>('video')
  const [enrolled, setEnrolled] = useState(false)

  useEffect(() => {
    // Mock course data - replace with actual Supabase query
    const mockCourse: Course = {
      id: courseId || '1',
      title: 'Railway Operations Fundamentals',
      description: 'Learn the basics of railway operations, safety protocols, and operational procedures. This comprehensive course covers everything from basic train operation to advanced safety systems.',
      thumbnail_url: 'https://images.pexels.com/photos/544966/pexels-photo-544966.jpeg?auto=compress&cs=tinysrgb&w=1200',
      duration_hours: 12,
      difficulty_level: 'beginner',
      instructor_name: 'Sarah Johnson',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setTimeout(() => {
      setCourse(mockCourse)
      setEnrolled(!!user) // Auto-enroll if user is logged in for demo
      setLoading(false)
    }, 500)
  }, [courseId, user])

  const handleEnroll = () => {
    if (user) {
      setEnrolled(true)
      // TODO: Implement actual enrollment logic with Supabase
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
                    <span>{course.instructor_name}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{course.duration_hours} hours</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span>4.8 (234 reviews)</span>
                  </div>
                </div>

                {enrolled ? (
                  <>
                    {/* Section Navigation */}
                    <div className="flex border-b border-gray-200 mb-6">
                      <button
                        onClick={() => setActiveSection('video')}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeSection === 'video'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Video Training
                      </button>
                      <button
                        onClick={() => setActiveSection('assessment')}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeSection === 'assessment'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Assessment
                      </button>
                      <button
                        onClick={() => setActiveSection('simulation')}
                        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeSection === 'simulation'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Cube className="h-4 w-4 mr-2" />
                        3D Simulation
                      </button>
                    </div>

                    {/* Active Section Content */}
                    <div className="mt-6">
                      {activeSection === 'video' && <VideoPlayer courseId={course.id} />}
                      {activeSection === 'assessment' && <Assessment courseId={course.id} />}
                      {activeSection === 'simulation' && <TrainSimulation courseId={course.id} />}
                    </div>
                  </>
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
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <Play className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm text-gray-700">Introduction to Railways</span>
                  </div>
                  <span className="text-xs text-gray-500">15 min</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <Play className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm text-gray-700">Safety Protocols</span>
                  </div>
                  <span className="text-xs text-gray-500">22 min</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm text-gray-700">Quiz: Basic Knowledge</span>
                  </div>
                  <span className="text-xs text-gray-500">10 min</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center">
                    <Cube className="h-4 w-4 text-purple-600 mr-2" />
                    <span className="text-sm text-gray-700">Train Controls Simulation</span>
                  </div>
                  <span className="text-xs text-gray-500">30 min</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetail