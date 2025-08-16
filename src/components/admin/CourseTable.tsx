import React, { useState } from 'react'
import { 
  Edit, 
  Trash2, 
  Eye, 
  MoreHorizontal, 
  CheckSquare, 
  Square,
  Globe,
  FileText,
  BookOpen
} from 'lucide-react'

// Local course type aligned with public.courses schema
type Course = {
  id: string
  title: string
  description: string
  thumbnail_url?: string
  duration_hours: number
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  is_published: boolean
  created_at: string
}

interface CourseTableProps {
  courses: Course[]
  selectedCourses: string[]
  onSelectCourse: (courseId: string) => void
  onSelectAll: (selected: boolean) => void
  onEditCourse: (course: Course) => void
  onDeleteCourse: (courseId: string) => void
  onViewCourse: (courseId: string) => void
  onTogglePublish?: (courseId: string, nextPublished: boolean) => void
  loading?: boolean
}

const CourseTable: React.FC<CourseTableProps> = ({
  courses,
  selectedCourses,
  onSelectCourse,
  onSelectAll,
  onEditCourse,
  onDeleteCourse,
  onViewCourse,
  onTogglePublish,
  loading = false
}) => {
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  const allSelected = courses.length > 0 && selectedCourses.length === courses.length
  const someSelected = selectedCourses.length > 0 && selectedCourses.length < courses.length

  const getPublishedBadge = (isPublished: boolean) => {
    const cls = isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    const Icon = isPublished ? Globe : FileText
    const text = isPublished ? 'Published' : 'Unpublished'
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        <Icon className="h-3 w-3 mr-1" />
        {text}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-100 border-b border-gray-200"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 border-b border-gray-100"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => onSelectAll(!allSelected)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {allSelected ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : someSelected ? (
                    <div className="h-5 w-5 bg-blue-600 rounded border-2 border-blue-600 flex items-center justify-center">
                      <div className="h-2 w-2 bg-white rounded-sm" />
                    </div>
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Published
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {courses.map((course) => (
              <tr key={course.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <button
                    onClick={() => onSelectCourse(course.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {selectedCourses.includes(course.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {course.thumbnail_url && (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-10 w-10 rounded-lg object-cover mr-3"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900 line-clamp-1">
                        {course.title}
                      </div>
                      <div className="text-sm text-gray-500 line-clamp-1">
                        {course.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {course.duration_hours}h
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                  {course.difficulty_level}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {onTogglePublish ? (
                    <button
                      onClick={() => onTogglePublish(course.id, !course.is_published)}
                      className="focus:outline-none"
                      title={course.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {getPublishedBadge(course.is_published)}
                    </button>
                  ) : (
                    getPublishedBadge(course.is_published)
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(course.created_at)}
                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                                        <button
                        onClick={() => onViewCourse(course.id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="View Details"
                    >
                        <Eye className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => onEditCourse(course)}
                        className="text-blue-500 hover:text-blue-700 p-1"
                        title="Edit Course"
                    >
                        <Edit className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => onDeleteCourse(course.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Course"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden">
        {courses.map((course) => (
          <div key={course.id} className="border-b border-gray-200 p-4">
            <div className="flex items-start space-x-3">
              <button
                onClick={() => onSelectCourse(course.id)}
                className="text-gray-400 hover:text-gray-600 mt-1"
              >
                {selectedCourses.includes(course.id) ? (
                  <CheckSquare className="h-5 w-5 text-blue-600" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
              </button>
              
              {course.thumbnail_url && (
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="h-16 w-16 rounded-lg object-cover flex-shrink-0"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {course.description}
                    </p>
                  </div>
                  
                  <div className="relative ml-2">
                    <button
                      onClick={() => setDropdownOpen(dropdownOpen === course.id ? null : course.id)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                    
                    {dropdownOpen === course.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              onViewCourse(course.id)
                              setDropdownOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          <button
                            onClick={() => {
                              onEditCourse(course)
                              setDropdownOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Course
                          </button>
                          <button
                            onClick={() => {
                              onDeleteCourse(course.id)
                              setDropdownOpen(null)
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Course
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{course.duration_hours}h</span>
                    <span className="capitalize">{course.difficulty_level}</span>
                  </div>
                  {onTogglePublish ? (
                    <button
                      onClick={() => onTogglePublish(course.id, !course.is_published)}
                      className="focus:outline-none"
                      title={course.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {getPublishedBadge(course.is_published)}
                    </button>
                  ) : (
                    getPublishedBadge(course.is_published)
                  )}
                </div>
                
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <span>{formatDate(course.created_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {courses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500">Get started by creating your first course.</p>
        </div>
      )}
    </div>
  )
}

export default CourseTable