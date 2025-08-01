import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase, Course } from '../lib/supabase'
import { Clock, Users, Star, BookOpen } from 'lucide-react'

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now - replace with actual Supabase query once database is set up
    const mockCourses: Course[] = [
      {
        id: '1',
        title: 'Railway Operations Fundamentals',
        description: 'Learn the basics of railway operations, safety protocols, and operational procedures.',
        thumbnail_url: 'https://images.pexels.com/photos/544966/pexels-photo-544966.jpeg?auto=compress&cs=tinysrgb&w=800',
        duration_hours: 12,
        difficulty_level: 'beginner',
        instructor_name: 'Sarah Johnson',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Advanced Train Control Systems',
        description: 'Master modern train control systems including ETCS, CBTC, and automated train operation.',
        thumbnail_url: 'https://images.pexels.com/photos/2026324/pexels-photo-2026324.jpeg?auto=compress&cs=tinysrgb&w=800',
        duration_hours: 18,
        difficulty_level: 'advanced',
        instructor_name: 'Michael Chen',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        title: 'Signal Systems and Safety',
        description: 'Comprehensive training on railway signaling systems, safety protocols, and emergency procedures.',
        thumbnail_url: 'https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=800',
        duration_hours: 15,
        difficulty_level: 'intermediate',
        instructor_name: 'Emma Rodriguez',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '4',
        title: 'Locomotive Operation & Maintenance',
        description: 'Hands-on training for locomotive operation, maintenance procedures, and troubleshooting.',
        thumbnail_url: 'https://images.pexels.com/photos/2657659/pexels-photo-2657659.jpeg?auto=compress&cs=tinysrgb&w=800',
        duration_hours: 24,
        difficulty_level: 'intermediate',
        instructor_name: 'David Thompson',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    setTimeout(() => {
      setCourses(mockCourses)
      setLoading(false)
    }, 500)
  }, [])

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
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.8 (234 reviews)</span>
                  </div>
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