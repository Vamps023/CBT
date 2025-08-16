import React, { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Archive,
  Globe,
  RefreshCw
} from 'lucide-react'
import { 
  courseService, 
  categoryService, 
  instructorService,
  AdminCourse, 
  Category, 
  Instructor,
  CourseStatus,
  subscribeToCoursesChanges
} from '../../lib/supabase-admin'
import CourseForm from '../../components/admin/CourseForm'
import CourseTable from '../../components/admin/CourseTable'
import toast from 'react-hot-toast'

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null)
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<CourseStatus | ''>('')
  const [sortBy, setSortBy] = useState<'title' | 'created_at' | 'price'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Selection state
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 10

  useEffect(() => {
    loadInitialData()
    
    // Set up real-time subscription
    const subscription = subscribeToCoursesChanges(() => {
      loadCourses()
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    loadCourses()
  }, [currentPage, searchTerm, selectedCategory, selectedStatus, sortBy, sortOrder])

  const loadInitialData = async () => {
    try {
      const [categoriesData, instructorsData] = await Promise.all([
        categoryService.getCategories(),
        instructorService.getInstructors()
      ])
      
      setCategories(categoriesData)
      setInstructors(instructorsData)
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Failed to load initial data')
    }
  }

  const loadCourses = async () => {
    try {
      setLoading(true)
      const result = await courseService.getCourses({
        page: currentPage,
        limit,
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        sortBy,
        sortOrder
      })
      
      setCourses(result.courses)
      setTotalPages(result.totalPages)
      setTotalCount(result.totalCount)
    } catch (error) {
      console.error('Error loading courses:', error)
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (courseData: any) => {
    try {
      setFormLoading(true)
      await courseService.createCourse(courseData)
      toast.success('Course created successfully')
      loadCourses()
    } catch (error) {
      console.error('Error creating course:', error)
      toast.error('Failed to create course')
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  const handleUpdateCourse = async (courseData: any) => {
    if (!editingCourse) return
    
    try {
      setFormLoading(true)
      await courseService.updateCourse(editingCourse.id, courseData)
      toast.success('Course updated successfully')
      loadCourses()
    } catch (error) {
      console.error('Error updating course:', error)
      toast.error('Failed to update course')
      throw error
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return
    
    try {
      await courseService.deleteCourse(courseId)
      toast.success('Course deleted successfully')
      loadCourses()
      setSelectedCourses(selectedCourses.filter(id => id !== courseId))
    } catch (error) {
      console.error('Error deleting course:', error)
      toast.error('Failed to delete course')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCourses.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedCourses.length} courses?`)) return
    
    try {
      await courseService.bulkDeleteCourses(selectedCourses)
      toast.success(`${selectedCourses.length} courses deleted successfully`)
      loadCourses()
      setSelectedCourses([])
    } catch (error) {
      console.error('Error bulk deleting courses:', error)
      toast.error('Failed to delete courses')
    }
  }

  const handleBulkStatusUpdate = async (status: CourseStatus) => {
    if (selectedCourses.length === 0) return
    
    try {
      await courseService.bulkUpdateStatus(selectedCourses, status)
      toast.success(`${selectedCourses.length} courses updated successfully`)
      loadCourses()
      setSelectedCourses([])
    } catch (error) {
      console.error('Error bulk updating courses:', error)
      toast.error('Failed to update courses')
    }
  }

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedCourses(selected ? courses.map(course => course.id) : [])
  }

  const handleEditCourse = (course: AdminCourse) => {
    setEditingCourse(course)
    setShowForm(true)
  }

  const handleViewCourse = (courseId: string) => {
    // Navigate to course detail view
    window.open(`/course/${courseId}`, '_blank')
  }

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setSelectedStatus('')
    setSortBy('created_at')
    setSortOrder('desc')
    setCurrentPage(1)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingCourse(null)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-600 mt-1">Manage your course catalog</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Course
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as CourseStatus | '')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          {/* Sort */}
          <div className="flex space-x-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-')
                setSortBy(field as 'title' | 'created_at' | 'price')
                setSortOrder(order as 'asc' | 'desc')
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="price-desc">Price High-Low</option>
              <option value="price-asc">Price Low-High</option>
            </select>
            
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Reset filters"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedCourses.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkStatusUpdate('published')}
                className="flex items-center px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                <Globe className="h-4 w-4 mr-1" />
                Publish
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('archived')}
                className="flex items-center px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
              >
                <Archive className="h-4 w-4 mr-1" />
                Archive
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Showing {courses.length} of {totalCount} courses
        </p>
        <button
          onClick={loadCourses}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>

      {/* Course Table */}
      <CourseTable
        courses={courses}
        selectedCourses={selectedCourses}
        onSelectCourse={handleSelectCourse}
        onSelectAll={handleSelectAll}
        onEditCourse={handleEditCourse}
        onDeleteCourse={handleDeleteCourse}
        onViewCourse={handleViewCourse}
        loading={loading}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm rounded-lg ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}

      {/* Course Form Modal */}
      <CourseForm
        isOpen={showForm}
        onClose={closeForm}
        onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse}
        initialData={editingCourse || undefined}
        categories={categories}
        instructors={instructors}
        loading={formLoading}
        title={editingCourse ? 'Edit Course' : 'Create New Course'}
      />
    </div>
  )
}

export default AdminCourses